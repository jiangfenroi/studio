
'use server';

import mysql from 'mysql2/promise';

/**
 * 获取数据库连接
 */
async function getConnection(config: any) {
  if (!config || !config.host) {
    throw new Error('MySQL 配置缺失，请先在登录页进行配置。');
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

/**
 * 序列化行数据，处理日期和 BigInt
 */
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

// ---------------- 工作人员认证与管理 ----------------

export async function checkConnection(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    return { success: true };
  } catch (e: any) {
    throw new Error(`连接失败: ${e.message}`);
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
    if (existing.length > 0) {
      throw new Error('账号已存在，请直接前往登录。');
    }
    const permissions = staff.jobId === '1058' ? '管理员' : '普通';
    const sql = `INSERT INTO SP_STAFF (jobId, password, name, status, role, permissions) VALUES (?, ?, ?, '在职', ?, ?)`;
    await connection.execute(sql, [staff.jobId, staff.password, staff.name, staff.role || '医生', permissions]);
    return { success: true };
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
    const sql = `UPDATE SP_STAFF SET name=?, role=?, status=?, permissions=? WHERE jobId=?`;
    await connection.execute(sql, [staff.name, staff.role, staff.status, staff.permissions, staff.jobId]);
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

// ---------------- 系统设置 ----------------

export async function fetchConfigFromMysql(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const [rows]: any = await connection.execute('SELECT * FROM SP_CONFIG WHERE configKey = "default"');
    return rows[0] ? serializeRow(rows[0]) : null;
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

// ---------------- 临床业务逻辑 ----------------

export async function syncPatientToMysql(config: any, patient: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `INSERT INTO SP_PERSON (archiveNo, name, gender, age, idNumber, organization, address, phoneNumber, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE name=VALUES(name), gender=VALUES(gender), age=VALUES(age), 
                 idNumber=VALUES(idNumber), organization=VALUES(organization), address=VALUES(address), 
                 phoneNumber=VALUES(phoneNumber), status=VALUES(status)`;
    await connection.execute(sql, [
      patient.id, patient.name, patient.gender, patient.age, patient.idNumber, 
      patient.organization, patient.address, patient.phoneNumber, patient.status
    ]);
    if (patient.status === '死亡') {
      await connection.execute('UPDATE SP_RW SET nextFollowUpDate = NULL WHERE archiveNo = ?', [patient.id]);
    }
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

export async function saveAnomalyResult(config: any, data: any) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.beginTransaction();

    const anomalyId = `YCJG${Date.now()}`;
    // 1. 确保档案表有此条基础记录（即便只有档案号）
    await connection.execute('INSERT IGNORE INTO SP_PERSON (archiveNo, status) VALUES (?, "正常")', [data.archiveNo]);

    const sqlYCJG = `INSERT INTO SP_YCJG 
      (id, archiveNo, checkupNumber, checkupDate, anomalyCategory, anomalyDetails, notifier, notifiedPerson, notificationDate, notificationTime, disposalSuggestions, notifiedPersonFeedback, isHealthEducationProvided, isNotified, isFollowUpRequired)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`;
    
    await connection.execute(sqlYCJG, [
      anomalyId, data.archiveNo, data.checkupNumber, data.checkupDate, data.anomalyCategory, 
      data.anomalyDetails, data.notifier, data.notifiedPerson, data.notificationDate, 
      data.notificationTime, data.disposalSuggestions, data.notifiedPersonFeedback,
      data.isHealthEducationProvided ? 1 : 0, data.isNotified ? 1 : 0
    ]);

    // 2. 自动生成 7 日随访任务
    const nextDate = new Date(data.notificationDate);
    nextDate.setDate(nextDate.getDate() + 7);
    const sqlRW = `INSERT INTO SP_RW (archiveNo, anomalyId, nextFollowUpDate) VALUES (?, ?, ?)
                   ON DUPLICATE KEY UPDATE nextFollowUpDate=VALUES(nextFollowUpDate)`;
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

export async function saveFollowUpRecord(config: any, data: any) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.beginTransaction();

    const sfId = `SF${Date.now()}`;
    const sqlSF = `INSERT INTO SP_SF (id, archiveNo, associatedAnomalyId, followUpResult, followUpPerson, followUpDate, followUpTime, isReExamined)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    await connection.execute(sqlSF, [
      sfId, data.archiveNo, data.anomalyId, data.followUpResult, data.followUpPerson, data.followUpDate, data.followUpTime, data.isReExamined ? 1 : 0
    ]);

    // 更新下次随访日期
    const sqlRW = `UPDATE SP_RW SET nextFollowUpDate = ? WHERE anomalyId = ?`;
    await connection.execute(sqlRW, [data.nextFollowUpDate, data.anomalyId]);

    // 更新异常表中的已随访标志
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

export async function fetchDashboardStats(config: any, selectedYear: number) {
  let connection;
  try {
    connection = await getConnection(config);
    const [todayCount]: any = await connection.execute('SELECT COUNT(*) as count FROM SP_YCJG WHERE notificationDate = CURRENT_DATE');
    const [pendingCount]: any = await connection.execute('SELECT COUNT(*) as count FROM SP_RW WHERE nextFollowUpDate <= CURRENT_DATE');
    const [totalPatients]: any = await connection.execute('SELECT COUNT(*) as count FROM SP_PERSON');
    
    // 获取指定年份的月度随访率统计
    const [trend]: any = await connection.execute(`
      SELECT 
        DATE_FORMAT(notificationDate, '%Y-%m') as month, 
        COUNT(*) as total, 
        SUM(CASE WHEN isFollowUpRequired = 1 THEN 1 ELSE 0 END) as followed
      FROM SP_YCJG 
      WHERE YEAR(notificationDate) = ?
      GROUP BY month 
      ORDER BY month ASC
    `, [selectedYear]);

    return { 
      todayNew: todayCount[0].count, 
      pendingTasks: pendingCount[0].count, 
      totalPatients: totalPatients[0].count, 
      trend: trend.map(serializeRow) 
    };
  } finally {
    if (connection) await connection.end();
  }
}

export async function calculateAllAges(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const [rows]: any = await connection.execute('SELECT archiveNo, idNumber FROM SP_PERSON');
    const currentYear = new Date().getFullYear();
    for (const row of rows) {
      if (row.idNumber && row.idNumber.length === 18) {
        const birthYear = parseInt(row.idNumber.substring(6, 10));
        const age = currentYear - birthYear;
        await connection.execute('UPDATE SP_PERSON SET age = ? WHERE archiveNo = ?', [age, row.archiveNo]);
      }
    }
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

export async function savePdfMetadata(config: any, data: any) {
  let connection;
  try {
    connection = await getConnection(config);
    // 生成 10 位倒序 ID
    const pdfId = (2000000000 - Math.floor(Date.now() / 1000)).toString().substring(0, 10);
    const sql = `INSERT INTO SP_PDF (id, archiveNo, checkDate, reportCategory, fullPath) VALUES (?, ?, ?, ?, ?)`;
    await connection.execute(sql, [pdfId, data.archiveNo, data.checkDate, data.reportCategory, data.fullPath]);
    return { success: true, pdfId };
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

export async function fetchDataForStats(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `
      SELECT p.*, y.checkupNumber, y.checkupDate, y.anomalyCategory, y.anomalyDetails, y.disposalSuggestions, y.notifier, y.notifiedPerson, y.notificationDate, y.isFollowUpRequired,
             sf.followUpDate, sf.followUpResult, sf.followUpPerson, sf.isReExamined
      FROM SP_PERSON p
      LEFT JOIN SP_YCJG y ON p.archiveNo = y.archiveNo
      LEFT JOIN SP_SF sf ON y.id = sf.associatedAnomalyId
      ORDER BY y.notificationDate DESC
    `;
    const [rows]: any = await connection.execute(sql);
    return rows.map(serializeRow);
  } finally {
    if (connection) await connection.end();
  }
}
