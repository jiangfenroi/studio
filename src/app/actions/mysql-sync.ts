
'use server';

/**
 * @fileOverview MySQL 数据同步核心引擎
 * 确保所有临床数据、账户权限及系统配置实时同步至中心数据库。
 */

import mysql from 'mysql2/promise';

async function getConnection(config: any) {
  return await mysql.createConnection({
    host: config.host || '172.17.168.18',
    port: parseInt(config.port || '10699'),
    user: config.user || 'medi_admin',
    password: config.password || 'AdminPassword123',
    database: config.database || 'meditrack_db',
  });
}

/**
 * 同步患者档案 (SP_PERSON)
 */
export async function syncPatientToMysql(config: any, patient: any, operation: 'SAVE' | 'DELETE') {
  if (!config) return;
  const connection = await getConnection(config);
  try {
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
    await connection.end();
  }
}

/**
 * 同步重要异常结果 (SP_YCJG)
 */
export async function syncAnomalyToMysql(config: any, record: any, operation: 'SAVE' | 'DELETE') {
  if (!config) return;
  const connection = await getConnection(config);
  try {
    if (operation === 'SAVE') {
      const data = {
        id: record.id,
        patientProfileId: record.patientProfileId,
        checkupNumber: record.checkupNumber || record.examNo,
        checkupDate: record.checkupDate || record.examDate,
        anomalyCategory: record.anomalyCategory,
        anomalyDetails: record.anomalyDetails,
        disposalSuggestions: record.disposalSuggestions,
        notifier: record.notifier,
        notificationDate: record.notificationDate,
        notificationTime: record.notificationTime,
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
    await connection.end();
  }
}

/**
 * 同步随访记录 (SP_SF)
 */
export async function syncFollowUpToMysql(config: any, record: any, operation: 'SAVE' | 'DELETE') {
  if (!config) return;
  const connection = await getConnection(config);
  try {
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
    await connection.end();
  }
}

/**
 * 同步账户信息 (SP_STAFF)
 */
export async function syncStaffToMysql(config: any, staff: any, operation: 'SAVE' | 'DELETE') {
  if (!config) return;
  const connection = await getConnection(config);
  try {
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
    await connection.end();
  }
}

/**
 * 同步全局配置 (SP_CONFIG)
 */
export async function syncConfigToMysql(config: any, systemConfig: any) {
  if (!config) return;
  const connection = await getConnection(config);
  try {
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
    await connection.end();
  }
}
