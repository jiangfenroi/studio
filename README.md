
# HealthInsight Registry - 重要异常结果管理系统 (MySQL 中心化版)

本系统专为医疗内网环境设计，临床数据与身份验证完全由中心 **MySQL 8.4** 承载，物理阻断 Firebase 数据同步。

## 1. 中心数据库初始化 (MySQL 8.4)

请在中心数据库服务器上执行以下脚本以创建 7 张核心业务表：

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

-- 4. 工作人员表 (SP_STAFF)
CREATE TABLE SP_STAFF (
  jobId VARCHAR(50) PRIMARY KEY COMMENT '工号/账号',
  password VARCHAR(100) NOT NULL,
  name VARCHAR(50),
  status ENUM('在职', '离职') DEFAULT '在职',
  role ENUM('医生', '护士', '其他'),
  permissions ENUM('普通', '管理员') DEFAULT '普通'
);

-- 5. PDF 归档表 (SP_PDF)
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
  PRIMARY KEY (archiveNo, anomalyId)
);

-- 7. 系统配置表 (SP_CONFIG)
CREATE TABLE SP_CONFIG (
  configKey VARCHAR(20) PRIMARY KEY DEFAULT 'default',
  appName VARCHAR(100),
  logoPath TEXT,
  pacsUrlBase TEXT,
  pdfStoragePath TEXT,
  authKey VARCHAR(50) DEFAULT 'HEALTH-INSIGHT-2025'
);
```

## 2. 核心架构特性

- **数据中心化**：所有业务逻辑依赖 MySQL `INNER JOIN` 联表查询。
- **计算本地化**：年龄计算、任务排程（7日锁定）、导出逻辑均在服务器端 Node.js 执行。
- **权限自动化**：工号 `1058` 注册即为管理员；注册需通过隐藏密钥 `HEALTH-INSIGHT-2025` 校验。

## 3. 部署指南

1. 安装 Node.js 20+ 及 MySQL 8.4。
2. 运行 `npm install`。
3. 启动：`npm start`。
4. 首次登录：在登录页配置 MySQL IP，并使用工号 `1058` 注册管理员。

---
*HealthInsight Registry • 100% MySQL 中心化数据驱动*
