
'use server';

import mysql from 'mysql2/promise';

/**
 * 获取数据库连接
 */
async function getConnection(config: any) {
  if (!config || !config.host) {
    throw new Error('MySQL 配置缺失');
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

// ---------------- 工作人员与登录相关 ----------------

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
    
    // 检查账号是否已存在
    const [existing]: any = await connection.execute('SELECT jobId FROM SP_STAFF WHERE jobId = ?', [staff.jobId]);
    if (existing.length > 0) {
      throw new Error('账号已存在，请前往登录。');
    }

    const permissions = staff.jobId === '1058' ? '管理员' : '普通';
    const sql = `INSERT INTO SP_STAFF (jobId, password, name, status, role, permissions) 
                 VALUES (?, ?, ?, '在职', ?, ?)`;
    await connection.execute(sql, [
      staff.jobId, staff.password, staff.name, staff.role, permissions
    ]);
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

// ---------------- PDF 与 临床业务 ----------------

export async function saveAnomalyResult(config: any, data: any) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.beginTransaction();

    const anomalyId = `YCJG${Date.now()}`;
    let pdfId = null;

    if (data.pdf) {
      pdfId = (2000000000 - Math.floor(Date.now() / 1000)).toString().substring(0, 10);
      const sqlPDF = `INSERT INTO SP_PDF (id, archiveNo, checkDate, reportCategory, fullPath) VALUES (?, ?, ?, ?, ?)`;
      await connection.execute(sqlPDF, [pdfId, data.archiveNo, data.checkupDate, '体检报告', data.pdf.path]);
    }
    
    const sqlYCJG = `INSERT INTO SP_YCJG 
      (id, archiveNo, checkupNumber, checkupDate, anomalyCategory, anomalyDetails, notifier, notifiedPerson, notificationDate, notificationTime, disposalSuggestions, notifiedPersonFeedback, isHealthEducationProvided, isNotified, isFollowUpRequired, pdfId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    await connection.execute(sqlYCJG, [
      anomalyId, data.archiveNo, data.checkupNumber, data.checkupDate, data.anomalyCategory, 
      data.anomalyDetails, data.notifier, data.notifiedPerson, data.notificationDate, 
      data.notificationTime, data.disposalSuggestions, data.notifiedPersonFeedback,
      data.isHealthEducationProvided ? 1 : 0, data.isNotified ? 1 : 0, 0, pdfId
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
