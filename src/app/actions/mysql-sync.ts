'use server';

/**
 * @fileOverview MySQL 数据同步与实时计算引擎 (增强型)
 * 增加了显式的连接日志和错误上抛机制，确保在互联网环境下同步失败时能即时反馈。
 */

import mysql from 'mysql2/promise';

async function getConnection(config: any) {
  if (!config || !config.host) {
    console.error('[MySQL] 尝试连接失败：数据库配置信息为空');
    throw new Error('MySQL 配置缺失，请先在配置中心设置数据库信息。');
  }
  
  console.log(`[MySQL] 正在尝试连接至: ${config.host}:${config.port || '3306'} (库名: ${config.database})`);
  
  return await mysql.createConnection({
    host: config.host,
    port: parseInt(config.port || '3306'),
    user: config.user,
    password: config.password,
    database: config.database,
    connectTimeout: 10000, // 增加到10秒超时，适应公网跨地域连接
  });
}

/**
 * 辅助函数：将数据库返回的行数据转换为纯 JSON
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

/**
 * 测试数据库连通性
 */
export async function testMysqlConnection(config: any) {
  if (!config || !config.host) return { success: false, message: '无效的配置信息' };
  let connection;
  try {
    connection = await getConnection(config);
    await connection.ping();
    console.log('[MySQL] 连通性测试成功');
    return { success: true, message: 'MySQL 数据库连接成功' };
  } catch (err: any) {
    console.error(`[MySQL] 连通性测试失败: ${err.message}`);
    return { success: false, message: `连接失败: ${err.message}。请检查防火墙设置、公网 IP 白名单或数据库权限。` };
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 首页实时统计
 */
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
  } catch (err: any) {
    console.error('[MySQL] 首页统计同步失败:', err.message);
    throw err;
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 异常记录同步
 */
export async function syncAnomalyToMysql(config: any, record: any, operation: 'SAVE' | 'DELETE') {
  if (!config || !config.host) {
    console.warn('[MySQL] 跳过同步：配置信息不完整');
    return;
  }
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
        createdAt: record.createdAt ? new Date(record.createdAt).toISOString().replace('T', ' ').substring(0, 19) : new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');
      const updates = keys.map(key => `${key} = VALUES(${key})`).join(', ');
      const sql = `INSERT INTO SP_YCJG (${keys.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
      await connection.execute(sql, values);
      console.log(`[MySQL] 异常记录同步成功: ${record.id}`);
    } else {
      await connection.execute('DELETE FROM SP_YCJG WHERE id = ?', [record.id]);
      console.log(`[MySQL] 异常记录删除成功: ${record.id}`);
    }
  } catch (err: any) {
    console.error(`[MySQL] 异常记录同步失败 [${operation}]:`, err.message);
    throw err;
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 患者档案同步
 */
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
        phoneNumber: patient.phoneNumber || patient.phone || '',
        status: patient.status || '正常'
      };
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');
      const updates = keys.map(key => `${key} = VALUES(${key})`).join(', ');
      const sql = `INSERT INTO SP_PERSON (${keys.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
      await connection.execute(sql, values);
      console.log(`[MySQL] 患者档案同步成功: ${data.archiveNo}`);
    } else {
      await connection.execute('DELETE FROM SP_PERSON WHERE archiveNo = ?', [patient.id || patient.archiveNo]);
      console.log(`[MySQL] 患者档案删除成功: ${patient.id || patient.archiveNo}`);
    }
  } catch (err: any) {
    console.error(`[MySQL] 患者档案同步失败 [${operation}]:`, err.message);
    throw err;
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 随访记录同步
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
      console.log(`[MySQL] 随访记录同步成功: ${record.id}`);
    } else {
      await connection.execute('DELETE FROM SP_SF WHERE id = ?', [record.id]);
      console.log(`[MySQL] 随访记录删除成功: ${record.id}`);
    }
  } catch (err: any) {
    console.error(`[MySQL] 随访记录同步失败 [${operation}]:`, err.message);
    throw err;
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 工作人员同步
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
      const sql = `INSERT INTO SP_STAFF (${keys.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
      await connection.execute(sql, values);
      console.log(`[MySQL] 工作人员同步成功: ${staff.jobId}`);
    } else {
      await connection.execute('DELETE FROM SP_STAFF WHERE jobId = ?', [staff.jobId]);
      console.log(`[MySQL] 工作人员删除成功: ${staff.jobId}`);
    }
  } catch (err: any) {
    console.error(`[MySQL] 工作人员同步失败 [${operation}]:`, err.message);
    throw err;
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 全局配置同步
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
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const updates = keys.map(key => `${key} = VALUES(${key})`).join(', ');
    const sql = `INSERT INTO SP_CONFIG (${keys.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
    await connection.execute(sql, values);
    console.log('[MySQL] 全局配置同步成功');
  } catch (err: any) {
    console.error('[MySQL] 全局配置同步失败:', err.message);
    throw err;
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 数据统计报表
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
    return (rows as any[]).map(row => serializeRow(row));
  } catch (err: any) {
    console.error('[MySQL] 报表数据抓取失败:', err.message);
    throw err;
  } finally {
    if (connection) await connection.end();
  }
}
