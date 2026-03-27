
'use server';

import mysql from 'mysql2/promise';

/**
 * 获取数据库连接
 */
async function getConnection(config: any) {
  if (!config || !config.host) {
    throw new Error('MySQL 配置缺失，请在登录页完成初始化。');
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

/**
 * 重要异常结果登记 (双级页面核心 Server Action)
 * 包含 SP_YCJG 录入与 SP_RW 自动排程
 */
export async function saveAnomalyResult(config: any, data: any) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.beginTransaction();

    const anomalyId = `YCJG${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    // 1. 插入异常记录 (SP_YCJG)
    const sqlYCJG = `INSERT INTO SP_YCJG 
      (id, archiveNo, checkupNumber, checkupDate, anomalyCategory, anomalyDetails, notifier, notifiedPerson, notificationDate, notificationTime, disposalSuggestions, notifiedPersonFeedback, isHealthEducationProvided, isNotified, isFollowUpRequired)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    await connection.execute(sqlYCJG, [
      anomalyId, data.archiveNo, data.checkupNumber, data.checkupDate, data.anomalyCategory, 
      data.anomalyDetails, data.notifier, data.notifiedPerson, data.notificationDate, 
      data.notificationTime, data.disposalSuggestions, data.notifiedPersonFeedback,
      data.isHealthEducationProvided ? 1 : 0, data.isNotified ? 1 : 0, 0 // 初始设为否
    ]);

    // 2. 自动生成 7 日随访任务 (SP_RW)
    const nextDate = new Date(data.notificationDate);
    nextDate.setDate(nextDate.getDate() + 7);
    const sqlRW = `INSERT INTO SP_RW (archiveNo, anomalyId, nextFollowUpDate) VALUES (?, ?, ?)`;
    await connection.execute(sqlRW, [data.archiveNo, anomalyId, nextDate.toISOString().split('T')[0]]);

    // 3. 处理 PDF (如有)
    if (data.pdfPath) {
      const pdfId = `PDF${Date.now()}`;
      await connection.execute(
        'INSERT INTO SP_PDF (id, archiveNo, checkDate, reportCategory, fullPath) VALUES (?, ?, ?, ?, ?)',
        [pdfId, data.archiveNo, data.checkupDate, '体检报告', data.pdfPath]
      );
    }

    await connection.commit();
    return { success: true, anomalyId };
  } catch (e) {
    if (connection) await connection.rollback();
    throw e;
  } finally {
    if (connection) await connection.end();
  }
}

// 完善个人信息 (SP_PERSON)
export async function syncPatientToMysql(config: any, data: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `INSERT INTO SP_PERSON (archiveNo, name, gender, age, phoneNumber, idNumber, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE name=VALUES(name), gender=VALUES(gender), age=VALUES(age), 
                 phoneNumber=VALUES(phoneNumber), idNumber=VALUES(idNumber), status=VALUES(status)`;
    await connection.execute(sql, [
      data.id, data.name, data.gender, data.age, data.phoneNumber, data.idNumber, data.status || '正常'
    ]);
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

// 结果管理列表 (全维度展示)
export async function fetchAllRecords(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `
      SELECT 
        y.*, 
        p.name as patientName, p.gender as patientGender, p.age as patientAge, 
        p.phoneNumber as patientPhone, p.idNumber as patientIdNumber, p.status as patientStatus
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

// 删除记录 (级联删除随访任务)
export async function deleteAnomalyRecord(config: any, id: string) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.beginTransaction();
    await connection.execute('DELETE FROM SP_RW WHERE anomalyId = ?', [id]);
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

// 首页统计
export async function fetchDashboardStats(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const [todayCount]: any = await connection.execute('SELECT COUNT(*) as count FROM SP_YCJG WHERE notificationDate = CURRENT_DATE');
    const [pendingCount]: any = await connection.execute('SELECT COUNT(*) as count FROM SP_RW WHERE nextFollowUpDate <= CURRENT_DATE');
    const [totalPatients]: any = await connection.execute('SELECT COUNT(*) as count FROM SP_PERSON');
    
    const [trend]: any = await connection.execute(`
      SELECT 
        DATE_FORMAT(notificationDate, '%Y-%m') as month,
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
