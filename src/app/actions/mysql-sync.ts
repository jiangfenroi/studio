
'use server';

import mysql from 'mysql2/promise';

/**
 * 获取数据库连接
 */
async function getConnection(config: any) {
  if (!config || !config.host) {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('mysql_config') : null;
    const finalConfig = config || (stored ? JSON.parse(stored) : null);
    if (!finalConfig) throw new Error('MySQL 配置缺失');
    config = finalConfig;
  }
  return await mysql.createConnection({
    host: config.host,
    port: parseInt(config.port || '3306'),
    user: config.user,
    password: config.password,
    database: config.database,
    connectTimeout: 10000,
  });
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

// 登录校验
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

// 注册用户
export async function registerUser(config: any, staff: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `INSERT INTO SP_STAFF (jobId, password, name, status, role, permissions) 
                 VALUES (?, ?, ?, '在职', ?, ?) 
                 ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role), permissions=VALUES(permissions)`;
    await connection.execute(sql, [
      staff.jobId, staff.password, staff.name, staff.role, 
      staff.jobId === '1058' ? '管理员' : '普通'
    ]);
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

// 保存异常结果
export async function saveAnomalyResult(config: any, data: any) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.beginTransaction();

    const anomalyId = data.id || `YCJG${Date.now()}`;
    
    const sqlYCJG = `INSERT INTO SP_YCJG 
      (id, archiveNo, checkupNumber, checkupDate, anomalyCategory, anomalyDetails, notifier, notifiedPerson, notificationDate, notificationTime, disposalSuggestions, notifiedPersonFeedback, isHealthEducationProvided, isNotified, isFollowUpRequired)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      anomalyCategory=VALUES(anomalyCategory), anomalyDetails=VALUES(anomalyDetails), 
      disposalSuggestions=VALUES(disposalSuggestions), notifiedPersonFeedback=VALUES(notifiedPersonFeedback)`;
    
    await connection.execute(sqlYCJG, [
      anomalyId, data.archiveNo, data.checkupNumber, data.checkupDate, data.anomalyCategory, 
      data.anomalyDetails, data.notifier, data.notifiedPerson, data.notificationDate, 
      data.notificationTime, data.disposalSuggestions, data.notifiedPersonFeedback,
      data.isHealthEducationProvided ? 1 : 0, data.isNotified ? 1 : 0, 0
    ]);

    // 自动在任务表生成 7 日随访
    const nextDate = new Date(data.notificationDate);
    nextDate.setDate(nextDate.getDate() + 7);
    const sqlRW = `INSERT INTO SP_RW (archiveNo, anomalyId, nextFollowUpDate) VALUES (?, ?, ?) 
                   ON DUPLICATE KEY UPDATE nextFollowUpDate = VALUES(nextFollowUpDate)`;
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

// 获取随访任务
export async function fetchFollowUpTasks(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `
      SELECT rw.nextFollowUpDate, rw.anomalyId, y.checkupNumber, y.checkupDate, y.anomalyCategory, y.anomalyDetails,
             p.archiveNo, p.name as patientName, p.gender as patientGender, p.age as patientAge, p.phoneNumber as patientPhone, p.status as patientStatus
      FROM SP_RW rw
      JOIN SP_YCJG y ON rw.anomalyId = y.id
      JOIN SP_PERSON p ON rw.archiveNo = p.archiveNo
      ORDER BY rw.nextFollowUpDate ASC
    `;
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

// 保存随访记录
export async function saveFollowUpRecord(config: any, data: any) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.beginTransaction();

    const sfId = data.id || `SF${Date.now()}`;
    const sqlSF = `INSERT INTO SP_SF 
      (id, archiveNo, checkupNumber, associatedAnomalyId, followUpResult, followUpPerson, followUpDate, followUpTime, isReExamined)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE followUpResult=VALUES(followUpResult), isReExamined=VALUES(isReExamined)`;
    
    await connection.execute(sqlSF, [
      sfId, data.archiveNo, data.checkupNumber || '', data.anomalyId, data.followUpResult, 
      data.followUpPerson, data.followUpDate, data.followUpTime, data.isReExamined ? 1 : 0
    ]);

    if (data.nextFollowUpDate) {
      await connection.execute('UPDATE SP_RW SET nextFollowUpDate = ? WHERE anomalyId = ?', [data.nextFollowUpDate, data.anomalyId]);
    }
    await connection.execute('UPDATE SP_YCJG SET isFollowUpRequired = 1 WHERE id = ?', [data.anomalyId]);

    if (data.pdf) {
      const pdfId = `PDF${Date.now()}`;
      await connection.execute(
        'INSERT INTO SP_PDF (id, archiveNo, checkDate, reportCategory, fullPath) VALUES (?, ?, ?, ?, ?)',
        [pdfId, data.archiveNo, data.pdf.checkDate, data.pdf.category, data.pdf.path]
      );
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

// 档案管理：同步患者并处理状态联动
export async function syncPatientToMysql(config: any, data: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `INSERT INTO SP_PERSON (archiveNo, name, gender, age, phoneNumber, idNumber, status, address, organization) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE 
                 name=VALUES(name), gender=VALUES(gender), age=VALUES(age), 
                 phoneNumber=VALUES(phoneNumber), idNumber=VALUES(idNumber), 
                 status=VALUES(status), address=VALUES(address), organization=VALUES(organization)`;
    
    await connection.execute(sql, [
      data.archiveNo || data.id, data.name, data.gender, data.age, data.phoneNumber || data.phone, 
      data.idNumber, data.status || '正常', data.address || '', data.organization || ''
    ]);

    // 状态联动：如果标记为死亡，清空随访任务日期
    if (data.status === '死亡') {
      await connection.execute('UPDATE SP_RW SET nextFollowUpDate = NULL WHERE archiveNo = ?', [data.archiveNo || data.id]);
    }

    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

// 自动计算全院年龄
export async function calculateAllAges(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const currentYear = new Date().getFullYear();
    
    // 1. 基于 18 位身份证计算
    await connection.execute(`
      UPDATE SP_PERSON 
      SET age = ? - CAST(SUBSTRING(idNumber, 7, 4) AS UNSIGNED) 
      WHERE LENGTH(idNumber) = 18 AND status != '死亡'
    `, [currentYear]);

    // 2. 无身份证者，根据体检日期偏移量增加 (简化逻辑：每年体检后检查)
    // 实际生产中可根据 SP_YCJG 的最后日期与当前日期比对
    
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

// 获取患者完整病历时间轴
export async function fetchPatientFullTimeline(config: any, archiveNo: string) {
  let connection;
  try {
    connection = await getConnection(config);
    
    // 获取个人资料
    const [pRow]: any = await connection.execute('SELECT * FROM SP_PERSON WHERE archiveNo = ?', [archiveNo]);
    const patient = pRow[0] ? serializeRow(pRow[0]) : null;

    // 获取异常记录
    const [yRows]: any = await connection.execute('SELECT * FROM SP_YCJG WHERE archiveNo = ? ORDER BY checkupDate DESC', [archiveNo]);
    const anomalies = yRows.map((r: any) => ({ ...serializeRow(r), type: 'abnormal' }));

    // 获取随访记录
    const [sRows]: any = await connection.execute('SELECT * FROM SP_SF WHERE archiveNo = ? ORDER BY followUpDate DESC', [archiveNo]);
    const followups = sRows.map((r: any) => ({ ...serializeRow(r), type: 'followup' }));

    // 获取 PDF
    const [pdfRows]: any = await connection.execute('SELECT * FROM SP_PDF WHERE archiveNo = ? ORDER BY checkDate DESC', [archiveNo]);
    const pdfs = pdfRows.map(serializeRow);

    return { patient, timeline: [...anomalies, ...followups].sort((a, b) => new Date(b.checkupDate || b.followUpDate).getTime() - new Date(a.checkupDate || a.followUpDate).getTime()), pdfs };
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

export async function fetchAllRecords(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `
      SELECT y.*, p.name as patientName, p.gender as patientGender, p.age as patientAge, p.phoneNumber as patientPhone, p.idNumber as patientIdNumber, p.status as patientStatus
      FROM SP_YCJG y 
      LEFT JOIN SP_PERSON p ON y.archiveNo = p.archiveNo 
      ORDER BY y.notificationDate DESC, y.notificationTime DESC
    `;
    const [rows]: any = await connection.execute(sql);
    return rows.map(serializeRow);
  } finally {
    if (connection) await connection.end();
  }
}

export async function fetchDashboardStats(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const [todayCount]: any = await connection.execute('SELECT COUNT(*) as count FROM SP_YCJG WHERE notificationDate = CURRENT_DATE');
    const [pendingCount]: any = await connection.execute('SELECT COUNT(*) as count FROM SP_RW WHERE nextFollowUpDate <= CURRENT_DATE');
    const [totalPatients]: any = await connection.execute('SELECT COUNT(*) as count FROM SP_PERSON');
    const [trend]: any = await connection.execute(`
      SELECT DATE_FORMAT(notificationDate, '%Y-%m') as month, COUNT(*) as total, SUM(CASE WHEN isFollowUpRequired = 1 THEN 1 ELSE 0 END) as followed
      FROM SP_YCJG GROUP BY month ORDER BY month DESC LIMIT 12
    `);
    return { todayNew: todayCount[0].count, pendingTasks: pendingCount[0].count, totalPatients: totalPatients[0].count, trend: trend.map(serializeRow) };
  } finally {
    if (connection) await connection.end();
  }
}

export async function syncConfigToMysql(config: any, sys: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `INSERT INTO SP_CONFIG (configKey, appName, pacsUrlBase, pdfStoragePath) 
                 VALUES ('default', ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE appName=VALUES(appName), pacsUrlBase=VALUES(pacsUrlBase), pdfStoragePath=VALUES(pdfStoragePath)`;
    await connection.execute(sql, [sys.appName, sys.pacsUrlBase, sys.pdfStoragePath]);
    return { success: true };
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
  } finally {
    if (connection) await connection.end();
  }
}

export async function clearAllStaffData(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await connection.execute('TRUNCATE TABLE SP_STAFF');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    if (connection) await connection.end();
  }
}
