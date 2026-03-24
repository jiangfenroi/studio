'use server';

/**
 * @fileOverview MySQL 数据同步核心引擎
 * 确保所有临床告知与宣教字段完整同步至业务库。
 */

import mysql from 'mysql2/promise';

async function getConnection(config: any) {
  return await mysql.createConnection({
    host: config.host || '172.17.168.18',
    port: parseInt(config.port || '10699'),
    user: config.user || 'medi_admin',
    password: config.password || 'AdminPassword123',
    database: config.database || 'meditrack_db',
    connectTimeout: 5000,
  });
}

/**
 * 同步重要异常结果 (SP_YCJG) - 包含所有告知细节
 */
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
        isClosed: record.isClosed ? 1 : 0
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
    console.error('MySQL Sync Error (Anomaly):', err);
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 获取统计报表数据 - 联表查询
 */
export async function fetchDataForStats(config: any) {
  if (!config || !config.host) return [];
  let connection;
  try {
    connection = await getConnection(config);
    // 联表查询：档案 (SP_PERSON) + 异常结果 (SP_YCJG) + 随访记录 (SP_SF)
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
    `;
    const [rows] = await connection.execute(sql);
    return rows;
  } catch (err) {
    console.error('MySQL Fetch Stats Error:', err);
    return [];
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 同步患者档案 (SP_PERSON)
 */
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
    console.error('MySQL Sync Error (Patient):', err);
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 同步随访记录 (SP_SF)
 */
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
    console.error('MySQL Sync Error (FollowUp):', err);
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 同步账户信息 (SP_STAFF)
 */
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
    console.error('MySQL Sync Error (Staff):', err);
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 同步全局配置 (SP_CONFIG)
 */
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
    console.error('MySQL Sync Error (Config):', err);
  } finally {
    if (connection) await connection.end();
  }
}
