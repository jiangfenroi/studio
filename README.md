# HealthInsight Registry - 重要异常结果管理系统 (MySQL 8.4 隔离版)

本系统专为医疗内网（物理隔离环境）设计，所有临床数据存储、身份验证及业务计算完全由中心 **MySQL 8.4** 数据库承载。系统采用 Next.js 构建，通过物理隔离的数据库链路确保医疗数据的严谨性。

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

## 2. 核心 UI 视觉规范 (Visual Standards)

为确保临床系统在处理高密度数据时的严谨性与易读性，系统遵循以下统一视觉体系：

### 2.1 字体与字号
- **姓名 (First Identifer)**: 全系统统一采用 `text-xl font-bold` (20px) 黑色加粗。
- **关键日期与电话 (Critical Data)**: 统一采用 `text-sm font-bold` (14px) 黑色加粗。包含体检日期、通知日期、联系电话。
- **辅助编号 (Technical IDs)**: 统一采用 `text-[10px] font-mono text-muted-foreground` (10px 灰色等宽)。包含档案编号、体检编号、记录 ID。

### 2.2 列表排版逻辑
- **档案信息列**: 采用“联系电话（上，粗体）/ 档案编号（下，细体）”结构。除病历档案页外，列表页移除电话图标。
- **体检信息列**: 采用“体检日期（上，粗体）/ 体检编号（下，细体）”结构。

### 2.3 交互组件规范
- **单行输入框**: 统一高度 `h-9`，字体 `text-sm`，减少空间占用。
- **长文本输入框**: 异常详情、回访结果等设置 `min-h-[140px]`，配合 `leading-relaxed` 宽行高。
- **只读详情页**: 采用高对比度展示逻辑，禁用状态下的文字依然保持黑色（`disabled:opacity-100`），确保可阅读性。

## 3. 业务闭环功能

- **双维度统计首页**：月随访率曲线图 + 月异常例数堆叠柱状图（A/B类）。
- **临床闭环管理**：
  - **重要异常登记**：登记后自动生成 7 日随访任务，支持 A/B 类分级（红色/蓝色标识）。
  - **独立详情与修改**：提供专用的详情只读页（`Eye` 图标）与修改编辑页（`Edit` 图标）。
  - **任务池驱动**：支持待处理任务实时检索与录入。
- **全生命周期病历轴**：以档案号为核心，通过 `Activity` 图标快速跳转，自动串联所有异常发现、随访及 PDF 报告记录。
- **物理报告归档**：支持将 PDF 报告物理复制到服务器磁盘（如 `C:\HealthReports\`）并建立数据库索引。

## 4. 部署与运行

### 环境要求
- Node.js 20+
- MySQL 8.4 (支持原生 `mysql2` 驱动)

### 运行
1. `npm install`
2. `npm run build`
3. `npm start` (默认监听端口 9002)

### 批量导入规范
若使用 **WPS** 或 **Excel** 编辑导入模板（CSV），请务必选择：**CSV UTF-8 (逗号分隔) (*.csv)** 格式保存，以确保中文临床描述在内网终端正确显示。