
# HealthInsight Registry - 重要异常结果管理系统

本系统是专为医疗内网设计的体检重要异常结果登记与随访管理系统。支持在 Windows 7 (旧式工作站) 和 Ubuntu 24.04 (新式服务器) 环境下稳定部署。

## 1. 核心网络架构说明 (重要)

由于本系统涉及“Server Actions” (服务端操作)，了解以下逻辑对排查 MySQL 连接问题至关重要：

- **云端 IDE 预览 (Firebase Studio)**: 当您在 Studio 的预览窗口点击“保存”或“同步”时，代码是在 **Google Cloud 服务器**上运行的。由于内网 IP (如 `172.17.x.x`) 在公网上不可访问，云端服务器**无法连接**您的本地内网 MySQL。
- **本地/内网部署**: 当您将项目拷贝到医院内网电脑并运行 `npm start` 后，代码是在**本地服务器**上运行的。此时，系统才能顺利连接同网段的 MySQL。

**结论**：在 Studio 云端预览时，MySQL 同步报错是正常现象。请以本地部署后的连接结果为准。

---

## 2. 数据库配置修改指南

### 方式 A：通过 UI 修改 (推荐)
1. 在登录页面，点击底部的 **“配置内网 MySQL 数据库”** 齿轮图标。
2. 输入您的数据库信息。
3. 点击 **“测试连通性”** 确认无误后，点击 **“应用并同步”**。

### 方式 B：手动修改源码默认值
如果您需要更改代码中的硬编码默认值，请修改以下文件：
- **登录页**: `src/app/login/page.tsx` 中的 `mysqlConfig` 初始状态。
- **管理页**: `src/app/settings/page.tsx` 中的 `formData` 初始状态。

---

## 3. 运行环境要求

### Windows 7 终端 (旧式工作站)
- **操作系统**: Windows 7 SP1 或更高。
- **关键补丁**: 必须安装 **KB2999226** (通用 C 运行库)。
- **Node.js**: 推荐离线版 `v18.18.0`。

---

## 4. 离线部署方案 (U盘 迁移)

1. **在中转机 (有网)**: `npm install` -> `npm run build`。
2. **拷贝至 U盘**: 拷贝 `node_modules`、`.next`、`package.json`、`public`、`start-app.bat`。
3. **在服务器 (无网)**: 插入 U盘，拷贝到 D盘，双击 `start-app.bat`。

---

## 5. MySQL 数据库初始化脚本

```sql
CREATE DATABASE IF NOT EXISTS meditrack_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE meditrack_db;

-- 1. 患者个人档案表
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

-- 2. 重要异常结果登记表
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
  FOREIGN KEY (patientProfileId) REFERENCES SP_PERSON(archiveNo)
);

-- 3. 临床随访记录表
CREATE TABLE IF NOT EXISTS SP_SF (
  id VARCHAR(100) PRIMARY KEY,
  associatedAnomalyId VARCHAR(100),
  patientProfileId VARCHAR(50),
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
