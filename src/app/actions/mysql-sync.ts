
'use server';

import mysql from 'mysql2/promise';

// 获取数据库连接的通用函数
async function getConnection(config: any) {
  if (!config || !config.host) {
    throw new Error('MySQL 数据库配置缺失，请先在系统设置中完成配置。');
  }
  return await mysql.createConnection({
    host: config.host,
    port: parseInt(config.port || '3306'),
    user: config.user,
    password: config.password,
    database: config.database,
    connectTimeout: 5000,
  });
}

// 序列化 MySQL 返回的行数据
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

// 获取系统全局配置
export async function fetchSystemConfig(dbConfig: any) {
  if (!dbConfig || !dbConfig.host) return null;
  let connection;
  try {
    connection = await getConnection(dbConfig);
    const [rows]: any = await connection.execute('SELECT * FROM SP_CONFIG WHERE configKey = "default"');
    return rows[0] ? serializeRow(rows[0]) : null;
  } finally {
    if (connection) await connection.end();
  }
}

// 测试 MySQL 连接
export async function testMysqlConnection(config: any) {
  if (!config || !config.host) return { success: false, message: '无效的配置信息' };
  let connection;
  try {
    connection = await getConnection(config);
    await connection.ping();
    return { success: true, message: 'MySQL 数据库连接成功' };
  } catch (err: any) {
    return { success: false, message: `连接失败: ${err.message}` };
  } finally {
    if (connection) await connection.end();
  }
}

// 首页聚合统计
export async function fetchHomeStats(config: any) {
  if (!config || !config.host) return null;
  let connection;
  try {
    connection = await getConnection(config);
    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();

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
        ORDER BY month
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

    return {
      totalPatients: Number(patientRows?.[0]?.count) || 0,
      todayNew: Number(todayRows?.[0]?.count) || 0,
      pendingTasks: Number(pendingRows?.[0]?.count) || 0,
      completionRate: Number(totalAnomalies?.[0]?.count) > 0 ? Math.round((Number(notifiedAnomalies?.[0]?.count) / Number(totalAnomalies?.[0]?.count)) * 100) : 0,
      trend: (trendRows as any[]).map((r: any) => ({
        month: Number(r.month),
        total: Number(r.total) || 0,
        notified: Number(r.notified) || 0
      })),
      categories: (catRows as any[]).map((r: any) => ({
        category: r.category,
        count: Number(r.count) || 0
      })),
      recentTasks: (recentTasks as any[]).map(t => serializeRow(t))
    };
  } finally {
    if (connection) await connection.end();
  }
}

// 获取全量临床结果（联表 SP_PERSON + SP_YCJG）
export async function fetchAllRecords(config: any) {
  if (!config || !config.host) return [];
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `
      SELECT 
        y.*, 
        p.name as patientName, p.gender as patientGender, p.age as patientAge, 
        p.idNumber as patientIdNumber, p.phoneNumber as patientPhone, 
        p.status as patientStatus, p.organization as patientOrg, p.address as patientAddr
      FROM SP_YCJG y
      JOIN SP_PERSON p ON y.patientProfileId = p.archiveNo
      ORDER BY y.checkupDate DESC
    `;
    const [rows] = await connection.execute(sql);
    return (rows as any[]).map(r => serializeRow(r));
  } finally {
    if (connection) await connection.end();
  }
}

// 获取患者列表
export async function fetchPatients(config: any) {
  if (!config || !config.host) return [];
  let connection;
  try {
    connection = await getConnection(config);
    const [rows] = await connection.execute('SELECT * FROM SP_PERSON ORDER BY archiveNo DESC');
    return (rows as any[]).map(r => ({ ...serializeRow(r), id: r.archiveNo }));
  } finally {
    if (connection) await connection.end();
  }
}

// 获取员工列表
export async function fetchStaffMembers(config: any) {
  if (!config || !config.host) return [];
  let connection;
  try {
    connection = await getConnection(config);
    const [rows] = await connection.execute('SELECT * FROM SP_STAFF ORDER BY jobId ASC');
    return (rows as any[]).map(r => ({ ...serializeRow(r), id: r.jobId }));
  } finally {
    if (connection) await connection.end();
  }
}

// 同步异常结果记录
export async function syncAnomalyToMysql(config: any, record: any, operation: 'SAVE' | 'DELETE') {
  if (!config || !config.host) return;
  let connection;
  try {
    connection = await getConnection(config);
    if (operation === 'SAVE') {
      const data = {
        id: record.id,
        patientProfileId: record.patientProfileId,
        checkupNumber: record.checkupNumber,
        checkupDate: record.checkupDate,
        anomalyCategory: record.anomalyCategory,
        anomalyDetails: record.anomalyDetails,
        disposalSuggestions: record.disposalSuggestions,
        notifiedPerson: record.notifiedPerson || '',
        notifier: record.notifier || '',
        notificationDate: record.notificationDate || null,
        notificationTime: record.notificationTime || null,
        isNotified: record.isNotified ? 1 : 0,
        isHealthEducationProvided: record.isHealthEducationProvided ? 1 : 0,
        notifiedPersonFeedback: record.notifiedPersonFeedback || '',
        isClosed: record.isClosed ? 1 : 0,
        createdAt: record.createdAt ? new Date(record.createdAt).toISOString().replace('T', ' ').substring(0, 19) : null
      };
      const keys = Object.keys(data);
      const values = Object.values(data);
      const updates = keys.map(key => `${key} = VALUES(${key})`).join(', ');
      const sql = `INSERT INTO SP_YCJG (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')}) ON DUPLICATE KEY UPDATE ${updates}`;
      await connection.execute(sql, values);
    } else {
      await connection.execute('DELETE FROM SP_YCJG WHERE id = ?', [record.id]);
    }
  } finally {
    if (connection) await connection.end();
  }
}

// 同步患者资料
export async function syncPatientToMysql(config: any, patient: any, operation: 'SAVE' | 'DELETE') {
  if (!config || !config.host) return;
  let connection;
  try {
    connection = await getConnection(config);
    if (operation === 'SAVE') {
      const data = {
        archiveNo: patient.id || patient.archiveNo,
        name: patient.name,
        gender: patient.gender,
        age: Number(patient.age) || 0,
        idNumber: patient.idNumber,
        organization: patient.organization || '',
        address: patient.address || '',
        phoneNumber: patient.phoneNumber || '',
        status: patient.status || '正常'
      };
      const updates = Object.keys(data).map(key => `${key} = VALUES(${key})`).join(', ');
      const sql = `INSERT INTO SP_PERSON (${Object.keys(data).join(', ')}) VALUES (${Object.keys(data).map(() => '?').join(', ')}) ON DUPLICATE KEY UPDATE ${updates}`;
      await connection.execute(sql, Object.values(data));
    } else {
      await connection.execute('DELETE FROM SP_PERSON WHERE archiveNo = ?', [patient.id || patient.archiveNo]);
    }
  } finally {
    if (connection) await connection.end();
  }
}

// 同步随访记录（含溯源字段）
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
        archiveNo: record.archiveNo || record.patientProfileId,
        checkupNumber: record.checkupNumber || '',
        followUpResult: record.followUpResult,
        followUpPerson: record.followUpPerson,
        followUpDate: record.followUpDate,
        followUpTime: record.followUpTime,
        isReExamined: record.isReExamined ? 1 : 0
      };
      const sql = `INSERT INTO SP_SF (${Object.keys(data).join(', ')}) VALUES (${Object.keys(data).map(() => '?').join(', ')})`;
      await connection.execute(sql, Object.values(data));
    } else {
      await connection.execute('DELETE FROM SP_SF WHERE id = ?', [record.id]);
    }
  } finally {
    if (connection) await connection.end();
  }
}

// 同步员工账户
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
        status: staff.status || '在职'
      };
      const updates = Object.keys(data).map(key => `${key} = VALUES(${key})`).join(', ');
      const sql = `INSERT INTO SP_STAFF (${Object.keys(data).join(', ')}) VALUES (${Object.keys(data).map(() => '?').join(', ')}) ON DUPLICATE KEY UPDATE ${updates}`;
      await connection.execute(sql, Object.values(data));
    } else {
      await connection.execute('DELETE FROM SP_STAFF WHERE jobId = ?', [staff.jobId]);
    }
  } finally {
    if (connection) await connection.end();
  }
}

// 同步全局配置
export async function syncConfigToMysql(config: any, sysConfig: any) {
  if (!config || !config.host) return;
  let connection;
  try {
    connection = await getConnection(config);
    const data = {
      configKey: 'default',
      appName: sysConfig.appName,
      pacsUrlBase: sysConfig.pacsUrlBase,
      pdfStoragePath: sysConfig.pdfStoragePath,
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    const updates = Object.keys(data).map(key => `${key} = VALUES(${key})`).join(', ');
    const sql = `INSERT INTO SP_CONFIG (${Object.keys(data).join(', ')}) VALUES (${Object.keys(data).map(() => '?').join(', ')}) ON DUPLICATE KEY UPDATE ${updates}`;
    await connection.execute(sql, Object.values(data));
  } finally {
    if (connection) await connection.end();
  }
}

// 报表导出全量大宽表查询
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
    return (rows as any[]).map(row => serializeRow(row));
  } finally {
    if (connection) await connection.end();
  }
}

// 随访任务查询
export async function fetchFollowUpTasks(config: any) {
  if (!config || !config.host) return { records: [], followups: [] };
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `
      SELECT 
        y.*, 
        p.name as patientName, p.gender as patientGender, p.age as patientAge, p.phoneNumber as patientPhone, p.status as patientStatus
      FROM SP_YCJG y
      JOIN SP_PERSON p ON y.patientProfileId = p.archiveNo
      ORDER BY y.createdAt DESC
    `;
    const [records] = await connection.execute(sql);
    const [followups] = await connection.execute('SELECT * FROM SP_SF ORDER BY followUpDate DESC');
    
    return {
      records: (records as any[]).map(r => serializeRow(r)),
      followups: (followups as any[]).map(f => serializeRow(f))
    };
  } finally {
    if (connection) await connection.end();
  }
}
