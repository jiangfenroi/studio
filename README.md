
# HealthInsight Registry - 重要异常结果管理系统 (MySQL 8.4 隔离版)

本系统专为医疗内网（物理隔离环境）设计，所有临床数据存储、身份验证及业务计算完全由中心 **MySQL 8.4** 数据库承载。

## 1. 数据库初始化 (MySQL 8.4)

请在中心服务器执行以下 SQL 脚本以创建核心业务表。注意：MySQL 8.4 中 `TEXT` 字段不能有 `DEFAULT` 值，路径字段已改为 `VARCHAR(512)`。

```sql
CREATE DATABASE IF NOT EXISTS meditrack_db CHARACTER SET utf8mb4;
USE meditrack_db;

-- 1. 个人档案表 (SP_PERSON)
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
  INDEX (archiveNo),
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
  INDEX (archiveNo),
  FOREIGN KEY (archiveNo) REFERENCES SP_PERSON(archiveNo)
);

-- 4. 工作人员表 (SP_STAFF)
CREATE TABLE SP_STAFF (
  jobId VARCHAR(50) PRIMARY KEY COMMENT '工号/账号',
  password VARCHAR(100) NOT NULL,
  name VARCHAR(50),
  status ENUM('在职', '离职') DEFAULT '在职',
  role ENUM('医生', '护士', '其他'),
  permissions ENUM('普通', '管理员') DEFAULT '普通'
);

-- 5. PDF 归档索引表 (SP_PDF)
CREATE TABLE SP_PDF (
  id VARCHAR(10) PRIMARY KEY COMMENT '10位倒序ID',
  archiveNo VARCHAR(50),
  checkDate DATE,
  reportCategory ENUM('体检报告', '影像检查报告', '内镜检查报告', '病理检查报告', '电生理检查报告'),
  fullPath TEXT,
  FOREIGN KEY (archiveNo) REFERENCES SP_PERSON(archiveNo)
);

-- 6. 待随访任务池 (SP_RW)
CREATE TABLE SP_RW (
  archiveNo VARCHAR(50),
  anomalyId VARCHAR(100),
  nextFollowUpDate DATE,
  PRIMARY KEY (archiveNo, anomalyId),
  FOREIGN KEY (anomalyId) REFERENCES SP_YCJG(id)
);

-- 7. 系统配置表 (SP_CONFIG)
CREATE TABLE SP_CONFIG (
  configKey VARCHAR(20) PRIMARY KEY,
  appName VARCHAR(100) DEFAULT 'HealthInsight Registry',
  logoPath VARCHAR(512),
  pacsUrlBase VARCHAR(512) DEFAULT 'http://172.16.201.61:7242/?ChtId=',
  pdfStoragePath VARCHAR(512) DEFAULT 'C:\\HealthReports\\',
  authKey VARCHAR(50) DEFAULT 'HEALTH-INSIGHT-2025'
);

-- 插入默认配置
INSERT IGNORE INTO SP_CONFIG (configKey) VALUES ('default');
```

## 2. 部署与环境

### 远程连接授权 (仅开发预览阶段需要)
如果您在 **AI 预览环境** 看到 `Access denied for user 'root'@'35.230.25.171'`，请在您的 MySQL 服务器执行以下命令：
```sql
-- 允许 AI 环境 IP 访问 (请谨慎使用，内网正式部署后应撤销)
CREATE USER 'root'@'35.230.25.171' IDENTIFIED BY '您的密码';
GRANT ALL PRIVILEGES ON meditrack_db.* TO 'root'@'35.230.25.171';
FLUSH PRIVILEGES;
```
**注意：** 当您将程序最终部署到 **内网服务器** 后，此 IP 报错将自动消失，无需再进行上述授权。

### 运行
1. 安装 Node.js 20+。
2. 运行 `npm install`。
3. 运行 `npm run build`。
4. 运行 `npm start`。
