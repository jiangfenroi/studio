
# HealthInsight Registry - 重要异常结果管理系统 (纯 MySQL 核心版)

本系统专为医疗内网环境设计，**100% 隔离运行**。数据存储、身份验证及逻辑计算完全由本地 **MySQL 8.4** 承载，严禁与 Firebase 进行临床数据交换。

## 1. 数据库初始化 (MySQL 8.4)

请在您的中心数据库服务器上执行以下脚本以创建表结构：

```sql
CREATE DATABASE IF NOT EXISTS meditrack_db CHARACTER SET utf8mb4;
USE meditrack_db;

-- 1. 个人信息表 (SP_PERSON)
CREATE TABLE SP_PERSON (
  archiveNo VARCHAR(50) PRIMARY KEY COMMENT '档案编号',
  name VARCHAR(50),
  gender ENUM('男', '女', '其他'),
  age INT,
  phoneNumber VARCHAR(20),
  idNumber VARCHAR(18),
  address TEXT,
  organization TEXT,
  status ENUM('正常', '死亡', '无法联系') DEFAULT '正常'
);

-- 2. 重要异常结果记录表 (SP_YCJG)
CREATE TABLE SP_YCJG (
  id VARCHAR(100) PRIMARY KEY COMMENT '重要异常结果编号',
  archiveNo VARCHAR(50),
  checkupNumber VARCHAR(12),
  checkupDate DATE,
  anomalyCategory ENUM('A', 'B'),
  anomalyDetails TEXT,
  notifier VARCHAR(50),
  notifiedPerson VARCHAR(50),
  notificationDate DATE,
  notificationTime TIME,
  disposalSuggestions TEXT,
  notifiedPersonFeedback TEXT,
  isHealthEducationProvided TINYINT(1) DEFAULT 1,
  isNotified TINYINT(1) DEFAULT 1,
  isFollowUpRequired TINYINT(1) DEFAULT 0,
  pdfId VARCHAR(100),
  FOREIGN KEY (archiveNo) REFERENCES SP_PERSON(archiveNo)
);

-- 3. 重要异常结果随访表 (SP_SF)
CREATE TABLE SP_SF (
  id VARCHAR(100) PRIMARY KEY,
  archiveNo VARCHAR(50),
  checkupNumber VARCHAR(12),
  associatedAnomalyId VARCHAR(100),
  followUpResult TEXT,
  followUpPerson VARCHAR(50),
  followUpDate DATE,
  followUpTime TIME,
  isReExamined TINYINT(1) DEFAULT 0,
  pdfId VARCHAR(100),
  FOREIGN KEY (archiveNo) REFERENCES SP_PERSON(archiveNo)
);

-- 4. 用户表 (SP_STAFF)
CREATE TABLE SP_STAFF (
  jobId VARCHAR(50) PRIMARY KEY COMMENT '账号',
  password VARCHAR(100) NOT NULL,
  name VARCHAR(50),
  status ENUM('在职', '离职') DEFAULT '在职',
  role ENUM('医生', '护士', '其他'),
  permissions ENUM('普通', '管理员') DEFAULT '普通'
);

-- 5. PDF 路径表 (SP_PDF)
CREATE TABLE SP_PDF (
  id VARCHAR(10) PRIMARY KEY COMMENT '10位倒序ID',
  archiveNo VARCHAR(50),
  checkDate DATE,
  reportCategory ENUM('体检报告', '影像检查报告', '内镜检查报告', '病理检查报告', '电生理检查报告'),
  fullPath TEXT,
  FOREIGN KEY (archiveNo) REFERENCES SP_PERSON(archiveNo)
);

-- 6. 待随访任务表 (SP_RW)
CREATE TABLE SP_RW (
  archiveNo VARCHAR(50),
  anomalyId VARCHAR(100),
  nextFollowUpDate DATE,
  PRIMARY KEY (archiveNo, anomalyId)
);

-- 7. 系统设置表 (SP_CONFIG)
CREATE TABLE SP_CONFIG (
  configKey VARCHAR(20) PRIMARY KEY DEFAULT 'default',
  appName VARCHAR(100),
  logoPath TEXT,
  pacsUrlBase TEXT,
  pdfStoragePath TEXT,
  authKey VARCHAR(50) DEFAULT 'HEALTH-INSIGHT-2025'
);
```

## 2. 核心逻辑说明

- **PDF 自动化归档**：系统基于 `SP_CONFIG` 中的 `pdfStoragePath`，自动按照 `档案编号\类别\文件名` 的逻辑生成物理存储路径，并记录至 `SP_PDF`。
- **倒序 ID 引擎**：PDF 编号采用 `2000000000 - timestamp` 的 10 位倒序逻辑，确保最新报告始终优先展示。
- **状态联动**：患者标记为“死亡”时，系统会自动清空 `SP_RW` 对应的随访日期，实现结案。

## 3. 部署指南

1. 安装 Node.js 20+ 及 MySQL 8.4。
2. 执行 `npm install`。
3. 运行 `npm start` 启动服务。
4. 首次登录请使用工号 `1058` 注册管理员账号。

---
*HealthInsight Registry • 100% MySQL 中心化报告管理中心*
