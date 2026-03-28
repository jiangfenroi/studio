# HealthInsight Registry - 重要异常结果管理系统 (MySQL 8.4 隔离版)

本系统专为医疗内网（物理隔离环境）设计，所有临床数据存储、身份验证及业务计算完全由中心 **MySQL 8.4** 数据库承载。

## 1. 数据库初始化 (MySQL 8.4)

请在中心服务器执行以下 SQL 脚本以创建核心业务表。

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
  fullPath VARCHAR(512),
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
  appName VARCHAR(100),
  logoPath VARCHAR(512),
  pacsUrlBase VARCHAR(512),
  pdfStoragePath VARCHAR(512),
  authKey VARCHAR(50)
);

-- 插入默认初始配置
INSERT IGNORE INTO SP_CONFIG (configKey, appName, pacsUrlBase, pdfStoragePath, authKey) 
VALUES ('default', 'HealthInsight Registry', 'http://172.16.201.61:7242/?ChtId=', 'C:\\HealthReports\\', 'HEALTH-INSIGHT-2025');
```

## 2. 部署与环境

### 默认连接参数
系统出厂预设连接至以下节点：
- **IP**: `172.17.126.18`
- **端口**: `10699`
- **账号**: `abc`
- **数据库**: `meditrack_db`

### 批量导入规范 (防止乱码)
若使用 **WPS** 或 **Excel** 编辑导入模板，请务必执行以下操作：
1. 编辑完成后，点击“文件” -> “另存为”。
2. 文件类型选择：**CSV UTF-8 (逗号分隔) (*.csv)**。
3. 系统已内置 UTF-8 BOM 识别，确保中文临床描述在内网终端正确显示。

### 运行
1. 安装 Node.js 20+。
2. 运行 `npm install`。
3. 运行 `npm run build`。
4. 运行 `npm start`。

## 3. 核心功能
- **双维度统计首页**：月随访率曲线图 + 月异常例数堆叠柱状图（A/B类）。
- **临床闭环管理**：重要异常结果登记后自动生成 7 日随访任务，支持被通知人反馈记录。
- **物理报告归档**：支持将 PDF 报告物理复制到服务器磁盘并建立索引。
- **全生命周期病历轴**：以档案号为核心，自动串联所有异常发现、随访及报告记录。
