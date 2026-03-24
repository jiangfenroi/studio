'use server';

/**
 * @fileOverview MySQL 数据同步与实时计算引擎 (高性能版)
 * 采用并发查询机制，显著提升首页统计同步速度。
 */

import mysql from 'mysql2/promise';

async function getConnection(config: any) {
  return await mysql.createConnection({
    host: config.host || '172.17.168.18',
    port: parseInt(config.port || '10699'),
    user: config.user || 'medi_admin',
    password: config.password || 'AdminPassword123',
    database: config.database || 'meditrack_db',
    connectTimeout: 3000, // 缩短超时时间以提高响应感知
  });
}

/**
 * 首页实时统计 - 并发聚合计算，确保同步速度
 */
export async function fetchHomeStats(config: any) {
  if (!config || !config.host) return null;
  let connection;
  try {
    connection = await getConnection(config);
    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();

    // 使用 Promise.all 并发执行所有统计查询，大幅降低延迟
    const [
      [patientRows],
      [todayRows],
      [pendingRows],
      [totalAnomalies],
      [notifiedAnomalies],
      [trendRows],
      [catRows],
      [recentTasks]
    ]: any = await Promise.all([
      connection.execute('SELECT COUNT(*) as count FROM SP_PERSON'),
      connection.execute('SELECT COUNT(*) as count FROM SP_YCJG WHERE checkupDate = ?', [today]),
      connection.execute('SELECT COUNT(*) as count FROM SP_YCJG WHERE isNotified = 0 AND isClosed = 0'),
      connection.execute('SELECT COUNT(*) as count FROM SP_YCJG'),
      connection.execute('SELECT COUNT(*) as count FROM SP_YCJG WHERE isNotified = 1'),
      connection.execute(`
        SELECT 
          MONTH(checkupDate) as month,
          COUNT(*) as total,
          SUM(isNotified) as notified
        FROM SP_YCJG 
        WHERE YEAR(checkupDate) = ?
        GROUP BY MONTH(checkupDate)
      `, [currentYear]),
      connection.execute('SELECT anomalyCategory as category, COUNT(*) as count FROM SP_YCJG GROUP BY anomalyCategory'),
      connection.execute(`
        SELECT y.*, p.name as patientName 
        FROM SP_YCJG y
        LEFT JOIN SP_PERSON p ON y.patientProfileId = p.archiveNo
        WHERE y.isNotified = 0 AND y.isClosed = 0
        ORDER BY y.createdAt DESC
        LIMIT 5
      `)
    ]);

    const totalCount = totalAnomalies[0].count || 0;
    const notifiedCount = notifiedAnomalies[0].count || 0;
    const completionRate = totalCount > 0 ? Math.round((notifiedCount / totalCount) * 100) : 0;

    return {
      totalPatients: patientRows[0].count,
      todayNew: todayRows[0].count,
      pendingTasks: pendingRows[0].count,
      completionRate,
      trend: trendRows,
      categories: catRows,
      recentTasks: recentTasks
    };
  } catch (err) {
    console.error('MySQL 并发同步失败:', err);
    return null;
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 数据统计报表 - 联表实时查询
 */
export async function fetchDataForStats(config: any) {
  if (!config || !config.host) return [];
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `
      SELECT 
        p.archiveNo, p.name, p.gender, p.age, p.idNumber, p.organization, p.phoneNumber, p.status as patientStatus,
        y.checkupNumber as examNo, y.checkupDate as examDate, y.anomalyCategory as category, y.anomalyDetails as details, 
        y.disposalSuggestions as disposalAdvice, y.notifier, y.notificationDate, y.notificationTime, 
        y.notifiedPerson, y.isNotified, y.isHealthEducationProvided, y.notifiedPersonFeedback,
        f.followUpDate, f.followUpResult, f.followUpPerson, f.isReExamined
      FROM SP_PERSON p
      LEFT JOIN SP_YCJG y ON p.archiveNo = y.patientProfileId
      LEFT JOIN SP_SF f ON y.id = f.associatedAnomalyId
      ORDER BY y.checkupDate DESC
    `;
    const [rows] = await connection.execute(sql);
    return rows;
  } catch (err) {
    console.error('MySQL 报表同步失败:', err);
    return [];
  } finally {
    if (connection) await connection.end();
  }
}

export async function syncAnomalyToMysql(config: any, record: any, operation: 'SAVE' | 'DELETE') {
  if (!config || !config.host) return;
  let connection;
  try {
    connection = await getConnection(config);
    if (operation === 'SAVE') {
      const data = {
        id: record.id,
        patientProfileId: record.patientProfileId,
        checkupNumber: record.checkupNumber || record.examNo,
        checkupDate: record.checkupDate || record.examDate,
        anomalyCategory: record.anomalyCategory,
        anomalyDetails: record.anomalyDetails,
        disposalSuggestions: record.disposalSuggestions,
        notifiedPerson: record.notifiedPerson || '',
        notifier: record.notifier || '',
        notificationDate: record.notificationDate || '',
        notificationTime: record.notificationTime || '',
        isNotified: record.isNotified ? 1 : 0,
        isHealthEducationProvided: record.isHealthEducationProvided ? 1 : 0,
        notifiedPersonFeedback: record.notifiedPersonFeedback || '',
        isClosed: record.isClosed ? 1 : 0,
        createdAt: record.createdAt || new Date().toISOString()
      };
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');
      const updates = keys.map(key => `${key} = VALUES(${key})`).join(', ');
      const sql = `INSERT INTO SP_YCJG (${keys.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
      await connection.execute(sql, values);
    } else {
      await connection.execute('DELETE FROM SP_YCJG WHERE id = ?', [record.id]);
    }
  } catch (err) {
    console.error('MySQL 异常记录同步失败:', err);
  } finally {
    if (connection) await connection.end();
  }
}

export async function syncPatientToMysql(config: any, patient: any, operation: 'SAVE' | 'DELETE') {
  if (!config || !config.host) return;
  let connection;
  try {
    connection = await getConnection(config);
    if (operation === 'SAVE') {
      const data = {
        archiveNo: patient.id,
        name: patient.name,
        gender: patient.gender,
        age: patient.age,
        idNumber: patient.idNumber,
        organization: patient.organization || '',
        address: patient.address || '',
        phoneNumber: patient.phoneNumber,
        status: patient.status
      };
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');
      const updates = keys.map(key => `${key} = VALUES(${key})`).join(', ');
      const sql = `INSERT INTO SP_PERSON (${keys.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
      await connection.execute(sql, values);
    } else {
      await connection.execute('DELETE FROM SP_PERSON WHERE archiveNo = ?', [patient.id]);
    }
  } catch (err) {
    console.error('MySQL 患者同步失败:', err);
  } finally {
    if (connection) await connection.end();
  }
}

export async function syncFollowUpToMysql(config: any, record: any, operation: 'SAVE' | 'DELETE') {
  if (!config || !config.host) return;
  let connection;
  try {
    connection = await getConnection(config);
    if (operation === 'SAVE') {
      const data = {
        id: record.id,
        associatedAnomalyId: record.associatedAnomalyId,
        patientProfileId: record.patientProfileId,
        followUpResult: record.followUpResult,
        followUpPerson: record.followUpPerson,
        followUpDate: record.followUpDate,
        followUpTime: record.followUpTime,
        isReExamined: record.isReExamined ? 1 : 0
      };
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');
      const updates = keys.map(key => `${key} = VALUES(${key})`).join(', ');
      const sql = `INSERT INTO SP_SF (${keys.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
      await connection.execute(sql, values);
    } else {
      await connection.execute('DELETE FROM SP_SF WHERE id = ?', [record.id]);
    }
  } catch (err) {
    console.error('MySQL 随访同步失败:', err);
  } finally {
    if (connection) await connection.end();
  }
}

export async function syncStaffToMysql(config: any, staff: any, operation: 'SAVE' | 'DELETE') {
  if (!config || !config.host) return;
  let connection;
  try {
    connection = await getConnection(config);
    if (operation === 'SAVE') {
      const data = {
        jobId: staff.jobId,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        status: staff.status
      };
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');
      const updates = keys.map(key => `${key} = VALUES(${key})`).join(', ');
      const sql = `INSERT INTO SP_STAFF (jobId, name, email, role, status) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
      await connection.execute(sql, values);
    } else {
      await connection.execute('DELETE FROM SP_STAFF WHERE jobId = ?', [staff.jobId]);
    }
  } catch (err) {
    console.error('MySQL 工作人员同步失败:', err);
  } finally {
    if (connection) await connection.end();
  }
}

export async function syncConfigToMysql(config: any, systemConfig: any) {
  if (!config || !config.host) return;
  let connection;
  try {
    connection = await getConnection(config);
    const data = {
      configKey: 'default',
      appName: systemConfig.appName,
      pacsUrlBase: systemConfig.pacsUrlBase,
      pdfStoragePath: systemConfig.pdfStoragePath,
      lastUpdated: new Date().toISOString()
    };
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const updates = keys.map(key => `${key} = VALUES(${key})`).join(', ');
    const sql = `INSERT INTO SP_CONFIG (${keys.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
    await connection.execute(sql, values);
  } catch (err) {
    console.error('MySQL 配置同步失败:', err);
  } finally {
    if (connection) await connection.end();
  }
}
