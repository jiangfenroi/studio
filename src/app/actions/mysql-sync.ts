
'use server';

import mysql from 'mysql2/promise';

/**
 * 获取数据库连接
 */
async function getConnection(config: any) {
  if (!config || !config.host) {
    throw new Error('MySQL 数据库配置缺失。');
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

// 1. 登录与注册逻辑 (纯 MySQL)
export async function authenticateUser(config: any, jobId: string, pass: string) {
  let connection;
  try {
    connection = await getConnection(config);
    const [rows]: any = await connection.execute('SELECT * FROM SP_STAFF WHERE jobId = ? AND password = ? AND status = "在职"', [jobId, pass]);
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
    await connection.execute(sql, [staff.jobId, staff.password, staff.name, staff.role, staff.permissions]);
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

// 2. 首页聚合统计 (纯计算)
export async function fetchDashboardStats(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const [todayCount]: any = await connection.execute('SELECT COUNT(*) as count FROM SP_YCJG WHERE checkupDate = CURRENT_DATE');
    const [pendingCount]: any = await connection.execute('SELECT COUNT(*) as count FROM SP_RW WHERE nextFollowUpDate <= CURRENT_DATE');
    const [totalPatients]: any = await connection.execute('SELECT COUNT(*) as count FROM SP_PERSON');
    
    // 随访趋势 (过去12个月)
    const [trend]: any = await connection.execute(`
      SELECT 
        DATE_FORMAT(checkupDate, '%Y-%m') as month,
        COUNT(*) as total,
        SUM(CASE WHEN isFollowUpRequired = 1 THEN 1 ELSE 0 END) as followed
      FROM SP_YCJG 
      GROUP BY month 
      ORDER BY month DESC LIMIT 12
    `);

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

// 3. 重要异常结果登记 (逻辑引擎)
export async function saveAnomalyResult(config: any, data: any) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.beginTransaction();

    // A. 插入异常记录
    const anomalyId = `YCJG${Date.now()}`;
    const sqlYCJG = `INSERT INTO SP_YCJG 
      (id, archiveNo, checkupNumber, checkupDate, anomalyCategory, anomalyDetails, notifier, notifiedPerson, notificationDate, notificationTime, disposalSuggestions, notifiedPersonFeedback, isHealthEducationProvided, isNotified, isFollowUpRequired)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`;
    await connection.execute(sqlYCJG, [
      anomalyId, data.archiveNo, data.checkupNumber, data.checkupDate, data.anomalyCategory, 
      data.anomalyDetails, data.notifier, data.notifiedPerson, data.notificationDate, 
      data.notificationTime, data.disposalSuggestions, data.notifiedPersonFeedback,
      data.isHealthEducationProvided ? 1 : 0, data.isNotified ? 1 : 0
    ]);

    // B. 自动生成随访任务 (7日后)
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

// 4. 随访任务管理
export async function fetchFollowUpTasks(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    // 待随访: 今日及之前
    const [pending]: any = await connection.execute(`
      SELECT r.*, p.name, p.gender, p.age, p.phoneNumber, y.anomalyCategory, y.anomalyDetails 
      FROM SP_RW r
      JOIN SP_PERSON p ON r.archiveNo = p.archiveNo
      JOIN SP_YCJG y ON r.anomalyId = y.id
      WHERE r.nextFollowUpDate <= CURRENT_DATE AND p.status != '死亡'
    `);
    // 已结案: 死亡或无下次日期
    const [closed]: any = await connection.execute(`
      SELECT r.*, p.name, p.status, y.anomalyDetails, s.followUpResult 
      FROM SP_RW r
      JOIN SP_PERSON p ON r.archiveNo = p.archiveNo
      JOIN SP_YCJG y ON r.anomalyId = y.id
      LEFT JOIN SP_SF s ON r.anomalyId = s.associatedAnomalyId
      WHERE p.status = '死亡' OR r.nextFollowUpDate IS NULL OR r.nextFollowUpDate > CURRENT_DATE
    `);
    return { pending: pending.map(serializeRow), closed: closed.map(serializeRow) };
  } finally {
    if (connection) await connection.end();
  }
}

// 5. 个人档案全景查询
export async function fetchPatientFullProfile(config: any, archiveNo: string) {
  let connection;
  try {
    connection = await getConnection(config);
    const [person]: any = await connection.execute('SELECT * FROM SP_PERSON WHERE archiveNo = ?', [archiveNo]);
    const [results]: any = await connection.execute('SELECT * FROM SP_YCJG WHERE archiveNo = ? ORDER BY checkupDate DESC', [archiveNo]);
    const [followups]: any = await connection.execute('SELECT * FROM SP_SF WHERE archiveNo = ? ORDER BY followUpDate DESC', [archiveNo]);
    const [pdfs]: any = await connection.execute('SELECT * FROM SP_PDF WHERE archiveNo = ? ORDER BY checkDate DESC', [archiveNo]);
    
    return {
      person: person[0] ? serializeRow(person[0]) : null,
      results: results.map(serializeRow),
      followups: followups.map(serializeRow),
      pdfs: pdfs.map(serializeRow)
    };
  } finally {
    if (connection) await connection.end();
  }
}

// 6. 年龄自动更新
export async function autoUpdateAges(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const [patients]: any = await connection.execute('SELECT archiveNo, idNumber, age FROM SP_PERSON');
    const currentYear = new Date().getFullYear();

    for (const p of patients) {
      let newAge = p.age;
      if (p.idNumber && p.idNumber.length === 18) {
        const birthYear = parseInt(p.idNumber.substring(6, 10));
        newAge = currentYear - birthYear;
      } else {
        newAge += 1; // 兜底逻辑：体检周期+1
      }
      await connection.execute('UPDATE SP_PERSON SET age = ? WHERE archiveNo = ?', [newAge, p.archiveNo]);
    }
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}
