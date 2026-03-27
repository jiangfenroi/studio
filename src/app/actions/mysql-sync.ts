
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

// ---------------- PDF 管理相关接口 ----------------

export async function savePdfMetadata(config: any, data: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const pdfId = (2000000000 - Math.floor(Date.now() / 1000)).toString().substring(0, 10);
    
    const sql = `INSERT INTO SP_PDF (id, archiveNo, checkDate, reportCategory, fullPath) 
                 VALUES (?, ?, ?, ?, ?)`;
    await connection.execute(sql, [
      pdfId, data.archiveNo, data.checkDate, data.reportCategory, data.fullPath
    ]);
    return { success: true, pdfId };
  } finally {
    if (connection) await connection.end();
  }
}

export async function deletePdfMetadata(config: any, pdfId: string) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.execute('DELETE FROM SP_PDF WHERE id = ?', [pdfId]);
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

export async function fetchPatientPdfs(config: any, archiveNo: string) {
  let connection;
  try {
    connection = await getConnection(config);
    const [rows]: any = await connection.execute(
      'SELECT * FROM SP_PDF WHERE archiveNo = ? ORDER BY checkDate DESC, id ASC',
      [archiveNo]
    );
    return rows.map(serializeRow);
  } finally {
    if (connection) await connection.end();
  }
}

// ---------------- 临床业务逻辑 ----------------

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

export async function saveFollowUpRecord(config: any, data: any) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.beginTransaction();

    let pdfId = null;
    if (data.pdf) {
      pdfId = (2000000000 - Math.floor(Date.now() / 1000)).toString().substring(0, 10);
      const sqlPDF = `INSERT INTO SP_PDF (id, archiveNo, checkDate, reportCategory, fullPath) VALUES (?, ?, ?, ?, ?)`;
      await connection.execute(sqlPDF, [pdfId, data.archiveNo, data.pdf.checkDate, data.pdf.category, data.pdf.path]);
    }

    const sfId = `SF${Date.now()}`;
    const sqlSF = `INSERT INTO SP_SF 
      (id, archiveNo, checkupNumber, associatedAnomalyId, followUpResult, followUpPerson, followUpDate, followUpTime, isReExamined, pdfId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    await connection.execute(sqlSF, [
      sfId, data.archiveNo, data.checkupNumber || '', data.anomalyId, data.followUpResult, 
      data.followUpPerson, data.followUpDate, data.followUpTime, data.isReExamined ? 1 : 0, pdfId
    ]);

    if (data.nextFollowUpDate) {
      await connection.execute('UPDATE SP_RW SET nextFollowUpDate = ? WHERE anomalyId = ?', [data.nextFollowUpDate, data.anomalyId]);
    }
    await connection.execute('UPDATE SP_YCJG SET isFollowUpRequired = 1 WHERE id = ?', [data.anomalyId]);

    await connection.commit();
    return { success: true };
  } catch (e) {
    if (connection) await connection.rollback();
    throw e;
  } finally {
    if (connection) await connection.end();
  }
}

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
      data.archiveNo || data.id, data.name, data.gender, data.age, data.phoneNumber, 
      data.idNumber, data.status || '正常', data.address || '', data.organization || ''
    ]);

    if (data.status === '死亡') {
      await connection.execute('UPDATE SP_RW SET nextFollowUpDate = NULL WHERE archiveNo = ?', [data.archiveNo || data.id]);
    }

    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

export async function calculateAllAges(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const currentYear = new Date().getFullYear();
    await connection.execute(`
      UPDATE SP_PERSON 
      SET age = ? - CAST(SUBSTRING(idNumber, 7, 4) AS UNSIGNED) 
      WHERE LENGTH(idNumber) = 18 AND status != '死亡'
    `, [currentYear]);
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

export async function fetchPatientFullTimeline(config: any, archiveNo: string) {
  let connection;
  try {
    connection = await getConnection(config);
    const [pRow]: any = await connection.execute('SELECT * FROM SP_PERSON WHERE archiveNo = ?', [archiveNo]);
    const patient = pRow[0] ? serializeRow(pRow[0]) : null;
    const [yRows]: any = await connection.execute('SELECT * FROM SP_YCJG WHERE archiveNo = ? ORDER BY checkupDate DESC', [archiveNo]);
    const anomalies = yRows.map((r: any) => ({ ...serializeRow(r), type: 'abnormal' }));
    const [sRows]: any = await connection.execute('SELECT * FROM SP_SF WHERE archiveNo = ? ORDER BY followUpDate DESC', [archiveNo]);
    const followups = sRows.map((r: any) => ({ ...serializeRow(r), type: 'followup' }));
    const [pdfRows]: any = await connection.execute('SELECT * FROM SP_PDF WHERE archiveNo = ? ORDER BY checkDate DESC', [archiveNo]);
    const pdfs = pdfRows.map(serializeRow);
    return { 
      patient, 
      timeline: [...anomalies, ...followups].sort((a, b) => new Date(b.checkupDate || b.followUpDate).getTime() - new Date(a.checkupDate || a.followUpDate).getTime()), 
      pdfs 
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

export async function fetchDataForStats(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `
      SELECT 
        p.archiveNo, p.name, p.gender, p.age, p.phoneNumber, p.idNumber, p.address, p.organization, p.status as patientStatus,
        y.checkupNumber, y.checkupDate, y.anomalyCategory, y.anomalyDetails, y.notifier, y.notifiedPerson, y.notificationDate, y.notificationTime, y.disposalSuggestions, y.notifiedPersonFeedback, y.isHealthEducationProvided, y.isNotified, y.isFollowUpRequired,
        s.followUpResult, s.followUpPerson, s.followUpDate, s.followUpTime, s.isReExamined
      FROM SP_PERSON p
      LEFT JOIN SP_YCJG y ON p.archiveNo = y.archiveNo
      LEFT JOIN SP_SF s ON y.id = (SELECT id FROM SP_SF WHERE associatedAnomalyId = y.id ORDER BY followUpDate DESC, followUpTime DESC LIMIT 1)
      ORDER BY p.archiveNo ASC, y.notificationDate DESC
    `;
    const [rows]: any = await connection.execute(sql);
    return rows.map(serializeRow);
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
