
'use server';

import mysql from 'mysql2/promise';

/**
 * 获取数据库连接
 * 配置信息来源于登录页面暂存的服务器端状态
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

// 1. 登录与注册逻辑 (纯 MySQL)
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

// 2. 首页聚合统计 (纯计算)
export async function fetchDashboardStats(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const [todayCount]: any = await connection.execute('SELECT COUNT(*) as count FROM SP_YCJG WHERE notificationDate = CURRENT_DATE');
    const [pendingCount]: any = await connection.execute('SELECT COUNT(*) as count FROM SP_RW WHERE nextFollowUpDate <= CURRENT_DATE');
    const [totalPatients]: any = await connection.execute('SELECT COUNT(*) as count FROM SP_PERSON');
    
    // 随访趋势 (过去12个月)
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

// 3. 重要异常结果登记 (双级页面引擎)
export async function saveAnomalyResult(config: any, data: any) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.beginTransaction();

    const anomalyId = `YCJG${Date.now()}`;
    
    // A. 插入异常记录 (SP_YCJG)
    const sqlYCJG = `INSERT INTO SP_YCJG 
      (id, archiveNo, checkupNumber, checkupDate, anomalyCategory, anomalyDetails, notifier, notifiedPerson, notificationDate, notificationTime, disposalSuggestions, notifiedPersonFeedback, isHealthEducationProvided, isNotified, isFollowUpRequired)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`;
    
    await connection.execute(sqlYCJG, [
      anomalyId, data.archiveNo, data.checkupNumber, data.checkupDate, data.anomalyCategory, 
      data.anomalyDetails, data.notifier, data.notifiedPerson, data.notificationDate, 
      data.notificationTime, data.disposalSuggestions, data.notifiedPersonFeedback,
      data.isHealthEducationProvided ? 1 : 0, data.isNotified ? 1 : 0
    ]);

    // B. 自动生成 7 日随访任务 (SP_RW)
    const nextDate = new Date(data.notificationDate);
    nextDate.setDate(nextDate.getDate() + 7);
    const sqlRW = `INSERT INTO SP_RW (archiveNo, anomalyId, nextFollowUpDate) VALUES (?, ?, ?)`;
    await connection.execute(sqlRW, [data.archiveNo, anomalyId, nextDate.toISOString().split('T')[0]]);

    // C. 如果有 PDF，同步写入 (SP_PDF)
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

// 4. 随访任务与记录管理
export async function saveFollowUp(config: any, data: any) {
  let connection;
  try {
    connection = await getConnection(config);
    await connection.beginTransaction();

    const sfId = `SF${Date.now()}`;
    
    // A. 插入随访记录 (SP_SF)
    const sqlSF = `INSERT INTO SP_SF (id, archiveNo, associatedAnomalyId, followUpResult, followUpPerson, followUpDate, followUpTime, isReExamined)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    await connection.execute(sqlSF, [
      sfId, data.archiveNo, data.anomalyId, data.followUpResult, 
      data.followUpPerson, data.followUpDate, data.followUpTime, 
      data.isReExamined ? 1 : 0
    ]);

    // B. 更新异常表随访状态 (SP_YCJG)
    await connection.execute('UPDATE SP_YCJG SET isFollowUpRequired = 1 WHERE id = ?', [data.anomalyId]);

    // C. 更新下次随访日期 (SP_RW)
    if (data.nextFollowUpDate) {
      await connection.execute(
        'UPDATE SP_RW SET nextFollowUpDate = ? WHERE archiveNo = ? AND anomalyId = ?',
        [data.nextFollowUpDate, data.archiveNo, data.anomalyId]
      );
    } else {
      await connection.execute('DELETE FROM SP_RW WHERE archiveNo = ? AND anomalyId = ?', [data.archiveNo, data.anomalyId]);
    }

    await connection.commit();
    return { success: true };
  } catch (e) {
    if (connection) await connection.rollback();
    throw e;
  } finally {
    if (connection) await connection.end();
  }
}

// 5. 档案全景查询 (三表关联)
export async function fetchPatientFullProfile(config: any, archiveNo: string) {
  let connection;
  try {
    connection = await getConnection(config);
    const [person]: any = await connection.execute('SELECT * FROM SP_PERSON WHERE archiveNo = ?', [archiveNo]);
    const [results]: any = await connection.execute('SELECT * FROM SP_YCJG WHERE archiveNo = ? ORDER BY notificationDate DESC', [archiveNo]);
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

// 6. 报表导出 (三表大宽表)
export async function fetchDataForStats(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `
      SELECT 
        p.archiveNo, p.name, p.gender, p.age, p.idNumber, p.phoneNumber, p.status as patientStatus,
        y.checkupNumber, y.checkupDate, y.anomalyCategory, y.anomalyDetails, y.disposalSuggestions, y.notifier,
        s.followUpDate, s.followUpResult, s.followUpPerson
      FROM SP_PERSON p
      LEFT JOIN SP_YCJG y ON p.archiveNo = y.archiveNo
      LEFT JOIN SP_SF s ON y.id = s.associatedAnomalyId
      ORDER BY y.notificationDate DESC
    `;
    const [rows]: any = await connection.execute(sql);
    return rows.map(serializeRow);
  } finally {
    if (connection) await connection.end();
  }
}

// 7. 自动更新全员年龄
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
        newAge += 1;
      }
      await connection.execute('UPDATE SP_PERSON SET age = ? WHERE archiveNo = ?', [newAge, p.archiveNo]);
    }
    return { success: true };
  } finally {
    if (connection) await connection.end();
  }
}

// 8. 待随访任务池
export async function fetchFollowUpTasks(config: any) {
  let connection;
  try {
    connection = await getConnection(config);
    const sql = `
      SELECT r.*, p.name, p.gender, p.age, p.phoneNumber, y.anomalyCategory, y.anomalyDetails, y.checkupDate
      FROM SP_RW r
      JOIN SP_PERSON p ON r.archiveNo = p.archiveNo
      JOIN SP_YCJG y ON r.anomalyId = y.id
      WHERE (p.status != '死亡' AND r.nextFollowUpDate <= CURRENT_DATE)
    `;
    const [rows]: any = await connection.execute(sql);
    return rows.map(serializeRow);
  } finally {
    if (connection) await connection.end();
  }
}
