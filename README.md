
# HealthInsight Registry - 重要异常结果管理系统 (纯 MySQL 隔离版)

本系统是专为医疗内网设计的 **100% 隔离运行** 的临床数据管理系统。数据存储与逻辑计算完全由本地 **MySQL 8.4** 承载，严禁并阻断一切与外部互联网（包括 Firebase Cloud）的数据交换。

## 1. 核心架构：中心化数据，本地化计算

- **单一数据引擎**: 临床数据、员工账户、系统配置 100% 存储于本地中心 MySQL。
- **内网隔离**: 系统支持在无互联网环境下运行，通过内网 IP 访问。
- **身份验证**: 剥离 Firebase Auth，登录直接通过 MySQL `SP_STAFF` 表进行账户名与密码比对。
- **自动排程**: 异常发现后，系统自动计算 7 日随访期并录入 `SP_RW` 任务表。

## 2. 数据库初始化脚本 (MySQL 8.4)

请在您的内网数据库服务器中执行以下脚本：

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
  id VARCHAR(100) PRIMARY KEY COMMENT '异常结果编号',
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

-- 5. 待随访任务表 (SP_RW)
CREATE TABLE SP_RW (
  archiveNo VARCHAR(50),
  anomalyId VARCHAR(100),
  nextFollowUpDate DATE,
  PRIMARY KEY (archiveNo, anomalyId)
);

-- 6. 系统设置表 (SP_CONFIG)
CREATE TABLE SP_CONFIG (
  configKey VARCHAR(20) PRIMARY KEY DEFAULT 'default',
  appName VARCHAR(100),
  logoPath TEXT,
  pacsUrlBase TEXT,
  pdfStoragePath TEXT,
  authKey VARCHAR(50) DEFAULT 'HEALTH-INSIGHT-2025'
);
```

## 3. 部署与安装指南

### Ubuntu 24.04 (内网部署)
1. 安装 Node.js 20+ 及 MySQL 8.4。
2. 配置 MySQL 允许内网其他终端连接 (`bind-address = 0.0.0.0`)。
3. 执行 `npm install` 补全依赖。
4. 执行 `npm run build` 生成生产包。
5. 运行 `npm start` 启动服务。

### Windows 部署
1. 安装 Node.js 生产环境。
2. 使用 `start-app.bat` (需自行编写) 调用 `npm start`。
3. 确保防火墙放行 3000/9002 端口。

---
*HealthInsight Registry • 内网数据中心化管理引擎*
