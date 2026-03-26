
# HealthInsight Registry - 重要异常结果管理系统 (MySQL 驱动版)

本系统是专为医疗内网设计的体检重要异常结果登记与随访管理系统。数据存储已完全切换至 MySQL，确保临床数据的严谨性与实时统计的准确性。

## 1. 核心网络架构

- **数据引擎**: 临床数据（患者、异常、随访）完全存储于 **MySQL**。Firebase 仅用于基础身份验证。
- **内网部署**: 在医院内网服务器运行 `npm start` 后，全院终端通过服务器 IP 访问。

## 2. 数据库配置

### 手动修改代码默认值
- **登录页**: `src/app/login/page.tsx` 中的 `mysqlConfig`。
- **管理页**: `src/app/settings/page.tsx` 中的 `formData`。

## 3. 运行环境要求 (Win7/Ubuntu)

### Windows 7 终端
- **补丁**: 必须安装 **KB2999226**。
- **启动**: 使用 `start-app.bat`。

## 4. MySQL 数据库初始化脚本 (最新)

```sql
CREATE DATABASE IF NOT EXISTS meditrack_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE meditrack_db;

-- 1. 患者个人档案表 (SP_PERSON)
CREATE TABLE IF NOT EXISTS SP_PERSON (
  archiveNo VARCHAR(50) PRIMARY KEY,
  name VARCHAR(50),
  gender ENUM('男', '女', '其他'),
  age INT,
  idNumber VARCHAR(18),
  organization VARCHAR(100),
  address VARCHAR(200),
  phoneNumber VARCHAR(20),
  status ENUM('正常', '死亡', '无法联系') DEFAULT '正常'
);

-- 2. 重要异常结果登记表 (SP_YCJG)
CREATE TABLE IF NOT EXISTS SP_YCJG (
  id VARCHAR(100) PRIMARY KEY,
  patientProfileId VARCHAR(50),
  checkupNumber VARCHAR(12),
  checkupDate DATE,
  anomalyCategory ENUM('A', 'B'),
  anomalyDetails TEXT,
  disposalSuggestions TEXT,
  notifiedPerson VARCHAR(50),
  notifier VARCHAR(50),
  notificationDate DATE,
  notificationTime TIME,
  isNotified TINYINT(1) DEFAULT 1,
  isHealthEducationProvided TINYINT(1) DEFAULT 1,
  notifiedPersonFeedback TEXT,
  isClosed TINYINT(1) DEFAULT 0,
  createdAt DATETIME,
  lastFollowUpAt DATETIME,
  nextFollowUpDate DATE,
  FOREIGN KEY (patientProfileId) REFERENCES SP_PERSON(archiveNo)
);

-- 3. 临床随访记录表 (SP_SF)
CREATE TABLE IF NOT EXISTS SP_SF (
  id VARCHAR(100) PRIMARY KEY,
  associatedAnomalyId VARCHAR(100),
  patientProfileId VARCHAR(50),
  archiveNo VARCHAR(50), -- 冗余字段方便查询
  checkupNumber VARCHAR(12), -- 冗余字段方便查询
  followUpResult TEXT,
  followUpPerson VARCHAR(50),
  followUpDate DATE,
  followUpTime TIME,
  isReExamined TINYINT(1) DEFAULT 0,
  FOREIGN KEY (associatedAnomalyId) REFERENCES SP_YCJG(id)
);

-- 4. 工作人员表
CREATE TABLE IF NOT EXISTS SP_STAFF (
  jobId VARCHAR(50) PRIMARY KEY,
  name VARCHAR(50),
  email VARCHAR(100),
  role ENUM('管理员', '医生', '护士'),
  status ENUM('在职', '离职') DEFAULT '在职'
);

-- 5. 全局系统配置表
CREATE TABLE IF NOT EXISTS SP_CONFIG (
  configKey VARCHAR(20) PRIMARY KEY DEFAULT 'default',
  appName VARCHAR(100),
  pacsUrlBase TEXT,
  pdfStoragePath TEXT,
  lastUpdated DATETIME
);
```
