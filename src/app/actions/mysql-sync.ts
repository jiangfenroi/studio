'use server';

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

/**
 * 获取数据库连接
 * 针对内网隔离环境深度优化
 */
async function getConnection(config: any) {
  if (!config || !config.host) {
    throw new Error('MySQL 链路未配置。请在登录页或设置中检查中心库参数。');
  }
  try {
    const connection = await mysql.createConnection({
      host: config.host,
      port: parseInt(config.port || '3306'),
      user: config.user,
      password: config.password || '',
      database: config.database,
      connectTimeout: 5000,
    });
    return connection;
  } catch (err: any) {
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      if (err.message.includes('35.230.25.171')) {
        throw new Error(`[AI 环境受限] 中心库拒绝了当前的开发 IP。请在本地内网服务器部署后再进行测试。`);
      }
      throw new Error(`中心库权限不足: 用户 '${config.user}' 未被授权访问数据库。`);
    }
    throw new Error(`数据库连接异常: ${err.message}`);
  }
}

function serializeRow(row: any) {
  const serialized = { ...row };
  for (const key in serialized) {
    if (serialized[key] instanceof Date) {
      serialized[key] = serialized[key].toISOString().split('T')[0];
    } else if (typeof serialized[key] === 'bigint') {
      serialized[key] = Number(serialized[key]);
    }
  }
  return serialized;
}

// ---------------- PDF 报告物理归档管理 ----------------

/**
 * 核心：真实物理归档并记录元数据
 * 将文件保存至 [根路径]\[档案号]\[报告类别] 目录下
 */
export async function uploadPdfFile(config: any, formData: FormData) {
  const archiveNo = formData.get('archiveNo') as string;
  const checkDate = formData.get('checkDate') as string;
  const reportCategory = formData.get('reportCategory') as string;
  const files = formData.getAll('files') as File[];

  if (!files || files.length === 0) throw new Error('未选择有效文件');

  const remoteConfig = await fetchConfigFromMysql(config);
  const rootPath = remoteConfig?.pdfStoragePath || 'C:\\HealthReports\\';

  let lastPdfId = "";

  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const targetDir = path.join(rootPath, archiveNo, reportCategory);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const filePath = path.join(targetDir, file.name);
      fs.writeFileSync(filePath, buffer);

      const res = await savePdfMetadata(config, {
        archiveNo,
        checkDate,
        reportCategory,
        fullPath: filePath
      });
      if (res.success) lastPdfId = res.pdfId;
    } catch (e: any) {
      console.error(`File save error: ${file.name}`, e);
      throw new Error(`物理磁盘写入失败: ${e.message}`);
    }
  }
  return { success: true, pdfId: lastPdfId };
}

export async function savePdfMetadata(config: any, data: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const pdfId = (2000000000 - Math.floor(Date.now() / 1000)).toString().substring(0, 10);
    const sql = `INSERT INTO SP_PDF (id, archiveNo, checkDate, reportCategory, fullPath) VALUES (?, ?, ?, ?, ?)`;
    await connection.execute(sql, [pdfId, data.archiveNo, data.checkDate, data.reportCategory, data.fullPath]);
    return { success: true, pdfId };
  } finally {
    if (connection) await connection.end();
  }
}

export async function deletePdfMetadata(config: any, id: string) {
  let connection;
  try {
    connection = await getConnection(config);
    const [rows]: any = await connection.execute('SELECT fullPath FROM SP_PDF WHERE id = ?', [id]);
    const filePath = rows[0]?.fullPath;
    await connection.execute('DELETE FROM SP_PDF WHERE id = ?', [id]);
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) { console.warn(`Physical file delete failed: ${filePath}`); }
    }
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

// ---------------- 临床业务逻辑 ----------------

export async function saveAnomalyResult(config: any, data: any) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.beginTransaction();
    const anomalyId = `YCJG${Date.now()}`;
    await connection.execute('INSERT IGNORE INTO SP_PERSON (archiveNo, status) VALUES (?, "正常")', [data.archiveNo]);
    const sqlYCJG = `INSERT INTO SP_YCJG 
      (id, archiveNo, checkupNumber, checkupDate, anomalyCategory, anomalyDetails, notifier, notifiedPerson, notificationDate, notificationTime, disposalSuggestions, notifiedPersonFeedback, isHealthEducationProvided, isNotified, isFollowUpRequired, pdfId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`;
    await connection.execute(sqlYCJG, [
      anomalyId, data.archiveNo, data.checkupNumber, data.checkupDate, data.anomalyCategory, 
      data.anomalyDetails, data.notifier, data.notifiedPerson, data.notificationDate, 
      data.notificationTime, data.disposalSuggestions, data.notifiedPersonFeedback,
      data.isHealthEducationProvided ? 1 : 0, data.isNotified ? 1 : 0, data.pdfId || null
    ]);
    const nextDate = new Date(data.notificationDate);
    nextDate.setDate(nextDate.getDate() + 7);
    const sqlRW = `INSERT INTO SP_RW (archiveNo, anomalyId, nextFollowUpDate) VALUES (?, ?, ?)`;
    await connection.execute(sqlRW, [data.archiveNo, anomalyId, nextDate.toISOString().split('T')[0]]);
    await connection.commit();
    return { success: true, anomalyId };
  } catch (e) {
    if (connection) await connection.rollback();
    throw e;
  } finally {
    if (connection) await connection.end();
  }
}

export async function updateAnomalyResult(config: any, id: string, data: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `UPDATE SP_YCJG SET 
      checkupNumber=?, checkupDate=?, anomalyCategory=?, anomalyDetails=?, 
      notifier=?, notifiedPerson=?, notificationDate=?, notificationTime=?, 
      disposalSuggestions=?, notifiedPersonFeedback=?, isHealthEducationProvided=?, isNotified=?, pdfId=?
      WHERE id=?`;
    await connection.execute(sql, [
      data.checkupNumber, data.checkupDate, data.anomalyCategory, data.anomalyDetails,
      data.notifier, data.notifiedPerson, data.notificationDate, data.notificationTime,
      data.disposalSuggestions, data.notifiedPersonFeedback, 
      data.isHealthEducationProvided ? 1 : 0, data.isNotified ? 1 : 0, data.pdfId || null,
      id
    ]);
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

export async function saveFollowUpRecord(config: any, data: any) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.beginTransaction();
    const sfId = `SF${Date.now()}`;
    const sqlSF = `INSERT INTO SP_SF (id, archiveNo, associatedAnomalyId, followUpResult, followUpPerson, followUpDate, followUpTime, isReExamined, pdfId)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    await connection.execute(sqlSF, [
      sfId, data.archiveNo, data.anomalyId, data.followUpResult, data.followUpPerson, data.followUpDate, data.followUpTime, data.isReExamined ? 1 : 0, data.pdfId || null
    ]);
    const sqlRW = `UPDATE SP_RW SET nextFollowUpDate = ? WHERE anomalyId = ?`;
    await connection.execute(sqlRW, [data.nextFollowUpDate, data.anomalyId]);
    const sqlYCJG = `UPDATE SP_YCJG SET isFollowUpRequired = 1 WHERE id = ?`;
    await connection.execute(sqlYCJG, [data.anomalyId]);
    await connection.commit();
    return { success: true };
  } catch (e) {
    if (connection) await connection.rollback();
    throw e;
  } finally {
    if (connection) await connection.end();
  }
}

// ---------------- 其他基础 Action ----------------

export async function checkConnection(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

export async function authenticateUser(config: any, jobId: string, pass: string) {
  let connection;
  try {
    connection = await getConnection(config);
    const [rows]: any = await connection.execute(
      'SELECT * FROM SP_STAFF WHERE jobId = ? AND password = ? AND status = "在职"',
      [jobId, pass]
    );
    return rows[0] ? serializeRow(rows[0]) : null;
  } finally {
    if (connection) await connection.end();
  }
}

export async function registerUser(config: any, staff: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const [existing]: any = await connection.execute('SELECT jobId FROM SP_STAFF WHERE jobId = ?', [staff.jobId]);
    if (existing.length > 0) throw new Error('账号已存在，请前往登录。');
    const permissions = staff.jobId === '1058' ? '管理员' : '普通';
    const sql = `INSERT INTO SP_STAFF (jobId, password, name, status, role, permissions) VALUES (?, ?, ?, '在职', ?, ?)`;
    await connection.execute(sql, [staff.jobId, staff.password, staff.name, staff.role || '医生', permissions]);
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

export async function fetchDashboardStats(config: any, selectedYear: number) {
  let connection;
  try {
    connection = await getConnection(config);
    const [todayCount]: any = await connection.execute('SELECT COUNT(*) as count FROM SP_YCJG WHERE notificationDate = CURRENT_DATE');
    const [pendingCount]: any = await connection.execute('SELECT COUNT(*) as count FROM SP_RW WHERE nextFollowUpDate <= CURRENT_DATE');
    const [totalPatients]: any = await connection.execute('SELECT COUNT(*) as count FROM SP_PERSON');
    const [trend]: any = await connection.execute(`
      SELECT DATE_FORMAT(notificationDate, '%Y-%m') as month, COUNT(*) as total, SUM(CASE WHEN isFollowUpRequired = 1 THEN 1 ELSE 0 END) as followed
      FROM SP_YCJG WHERE YEAR(notificationDate) = ? GROUP BY month ORDER BY month ASC
    `, [selectedYear]);
    return { todayNew: todayCount[0].count, pendingTasks: pendingCount[0].count, totalPatients: totalPatients[0].count, trend: trend.map(serializeRow) };
  } finally {
    if (connection) await connection.end();
  }
}

export async function fetchConfigFromMysql(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const [rows]: any = await connection.execute('SELECT * FROM SP_CONFIG LIMIT 1');
    return rows[0] ? serializeRow(rows[0]) : null;
  } finally {
    if (connection) await connection.end();
  }
}

export async function syncConfigToMysql(config: any, sys: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `INSERT INTO SP_CONFIG (configKey, appName, pacsUrlBase, pdfStoragePath) VALUES ('default', ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE appName=VALUES(appName), pacsUrlBase=VALUES(pacsUrlBase), pdfStoragePath=VALUES(pdfStoragePath)`;
    await connection.execute(sql, [sys.appName, sys.pacsUrlBase, sys.pdfStoragePath]);
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

export async function fetchPatients(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const [rows]: any = await connection.execute('SELECT * FROM SP_PERSON ORDER BY archiveNo ASC');
    return rows.map(serializeRow);
  } finally {
    if (connection) await connection.end();
  }
}

export async function syncPatientToMysql(config: any, patient: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `INSERT INTO SP_PERSON (archiveNo, name, gender, age, idNumber, organization, address, phoneNumber, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE name=VALUES(name), gender=VALUES(gender), age=VALUES(age), idNumber=VALUES(idNumber), organization=VALUES(organization), address=VALUES(address), phoneNumber=VALUES(phoneNumber), status=VALUES(status)`;
    await connection.execute(sql, [patient.id, patient.name, patient.gender, patient.age, patient.idNumber, patient.organization, patient.address, patient.phoneNumber, patient.status]);
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

export async function fetchAllRecords(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `SELECT y.*, p.name as patientName, p.gender as patientGender, p.age as patientAge, p.phoneNumber as patientPhone, p.idNumber as patientIdNumber, p.status as patientStatus
                 FROM SP_YCJG y LEFT JOIN SP_PERSON p ON y.archiveNo = p.archiveNo ORDER BY y.notificationDate DESC, y.notificationTime DESC`;
    const [rows]: any = await connection.execute(sql);
    return rows.map(serializeRow);
  } finally {
    if (connection) await connection.end();
  }
}

export async function fetchFollowUpTasks(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `SELECT rw.nextFollowUpDate, rw.anomalyId, y.checkupNumber, y.checkupDate, y.anomalyCategory, y.anomalyDetails,
                        p.archiveNo, p.name as patientName, p.gender as patientGender, p.age as patientAge, p.phoneNumber as patientPhone, p.status as patientStatus
                 FROM SP_RW rw JOIN SP_YCJG y ON rw.anomalyId = y.id JOIN SP_PERSON p ON rw.archiveNo = p.archiveNo ORDER BY rw.nextFollowUpDate ASC`;
    const [rows]: any = await connection.execute(sql);
    const serializedRows = rows.map(serializeRow);
    const today = new Date().toISOString().split('T')[0];
    return {
      pending: serializedRows.filter((r: any) => r.patientStatus !== '死亡' && r.nextFollowUpDate && r.nextFollowUpDate <= today),
      closed: serializedRows.filter((r: any) => r.patientStatus === '死亡' || !r.nextFollowUpDate || r.nextFollowUpDate > today)
    };
  } finally {
    if (connection) await connection.end();
  }
}

export async function deleteAnomalyRecord(config: any, id: string) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.beginTransaction();
    await connection.execute('DELETE FROM SP_RW WHERE anomalyId = ?', [id]);
    await connection.execute('DELETE FROM SP_SF WHERE associatedAnomalyId = ?', [id]);
    await connection.execute('DELETE FROM SP_YCJG WHERE id = ?', [id]);
    await connection.commit();
    return { success: true };
  } catch (e) {
    if (connection) await connection.rollback();
    throw e;
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 随访记录删除逻辑增强：
 * 如果删除后 SP_SF 中不再存在该异常的记录，则将 SP_YCJG 的 isFollowUpRequired 置为 0 (否)。
 */
export async function deleteFollowUpRecord(config: any, id: string) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.beginTransaction();

    // 1. 获取关联的异常记录ID
    const [rows]: any = await connection.execute('SELECT associatedAnomalyId FROM SP_SF WHERE id = ?', [id]);
    if (rows.length === 0) {
      await connection.rollback();
      return { success: true };
    }
    const anomalyId = rows[0].associatedAnomalyId;

    // 2. 执行物理删除
    await connection.execute('DELETE FROM SP_SF WHERE id = ?', [id]);

    // 3. 统计该异常剩余的随访记录数量
    const [countResult]: any = await connection.execute('SELECT COUNT(*) as count FROM SP_SF WHERE associatedAnomalyId = ?', [anomalyId]);
    
    // 4. 若无剩余随访记录，更新主表状态
    if (countResult[0].count === 0) {
      await connection.execute('UPDATE SP_YCJG SET isFollowUpRequired = 0 WHERE id = ?', [anomalyId]);
    }

    await connection.commit();
    return { success: true };
  } catch (e) {
    if (connection) await connection.rollback();
    throw e;
  } finally {
    if (connection) await connection.end();
  }
}

export async function fetchPatientFullTimeline(config: any, archiveNo: string) {
  let connection;
  try {
    connection = await getConnection(config);
    const [patient]: any = await connection.execute('SELECT * FROM SP_PERSON WHERE archiveNo = ?', [archiveNo]);
    const [records]: any = await connection.execute('SELECT * FROM SP_YCJG WHERE archiveNo = ? ORDER BY notificationDate DESC', [archiveNo]);
    const [followups]: any = await connection.execute('SELECT * FROM SP_SF WHERE archiveNo = ? ORDER BY followUpDate DESC', [archiveNo]);
    const [pdfs]: any = await connection.execute('SELECT * FROM SP_PDF WHERE archiveNo = ? ORDER BY checkDate DESC', [archiveNo]);
    const timeline = [
      ...records.map((r: any) => ({ ...serializeRow(r), type: 'abnormal' })),
      ...followups.map((f: any) => ({ ...serializeRow(f), type: 'followup' }))
    ].sort((a: any, b: any) => (b.notificationDate || b.followUpDate).localeCompare(a.notificationDate || a.followUpDate));
    return { patient: patient[0] ? serializeRow(patient[0]) : null, timeline, pdfs: pdfs.map(serializeRow) };
  } finally {
    if (connection) await connection.end();
  }
}

export async function calculateAllAges(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const [rows]: any = await connection.execute('SELECT archiveNo, idNumber, age FROM SP_PERSON');
    const currentYear = new Date().getFullYear();
    for (const row of rows) {
      let newAge = row.age;
      if (row.idNumber && row.idNumber.length === 18) {
        newAge = currentYear - parseInt(row.idNumber.substring(6, 10));
      } else {
        const [lastCheck]: any = await connection.execute('SELECT checkupDate FROM SP_YCJG WHERE archiveNo = ? ORDER BY checkupDate DESC LIMIT 1', [row.archiveNo]);
        if (lastCheck[0]?.checkupDate) {
          const yearsDiff = currentYear - new Date(lastCheck[0].checkupDate).getFullYear();
          if (yearsDiff > 0) newAge = (row.age || 0) + yearsDiff;
        }
      }
      if (newAge !== row.age) await connection.execute('UPDATE SP_PERSON SET age = ? WHERE archiveNo = ?', [newAge, row.archiveNo]);
    }
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

export async function clearAllClinicalData(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await connection.execute('TRUNCATE TABLE SP_SF');
    await connection.execute('TRUNCATE TABLE SP_RW');
    await connection.execute('TRUNCATE TABLE SP_YCJG');
    await connection.execute('TRUNCATE TABLE SP_PERSON');
    await connection.execute('TRUNCATE TABLE SP_PDF');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

export async function clearAllStaffData(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.execute('TRUNCATE TABLE SP_STAFF');
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 全量业务导出数据检索 (三表实时关联)
 */
export async function fetchDataForStats(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `
      SELECT 
        p.archiveNo, p.name, p.gender, p.age, p.phoneNumber, p.idNumber, p.address, p.organization, p.status as patientStatus,
        y.checkupNumber, y.checkupDate, y.anomalyCategory, y.anomalyDetails, y.notifier, y.notifiedPerson, 
        y.notificationDate, y.notificationTime, y.disposalSuggestions, y.notifiedPersonFeedback, 
        y.isHealthEducationProvided, y.isNotified, y.isFollowUpRequired,
        sf.followUpResult, sf.followUpPerson, sf.followUpDate, sf.followUpTime, sf.isReExamined
      FROM SP_PERSON p 
      LEFT JOIN SP_YCJG y ON p.archiveNo = y.archiveNo 
      LEFT JOIN SP_SF sf ON y.id = sf.associatedAnomalyId 
      ORDER BY y.notificationDate DESC, y.notificationTime DESC
    `;
    const [rows]: any = await connection.execute(sql);
    return rows.map(serializeRow);
  } finally {
    if (connection) await connection.end();
  }
}

export async function fetchAllStaff(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const [rows]: any = await connection.execute('SELECT * FROM SP_STAFF ORDER BY jobId ASC');
    return rows.map(serializeRow);
  } finally {
    if (connection) await connection.end();
  }
}

export async function updateStaff(config: any, staff: any) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.execute('UPDATE SP_STAFF SET name=?, role=?, status=?, permissions=? WHERE jobId=?', [staff.name, staff.role, staff.status, staff.permissions, staff.jobId]);
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

export async function deleteStaff(config: any, jobId: string) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.execute('DELETE FROM SP_STAFF WHERE jobId = ?', [jobId]);
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}
