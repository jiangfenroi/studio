
# HealthInsight Registry - 重要异常结果管理系统 (MySQL 核心驱动版)

本系统是专为医疗内网设计的体检重要异常结果登记与随访管理系统。数据存储已完全切换至 **MySQL 8.4**，**严禁并禁止**与 Firebase Firestore 云端进行任何临床数据交换，确保数据主权完全留在医院内网。

## 1. 核心架构与安全策略

- **数据引擎**: 临床数据（患者、异常、随访）、员工信息及系统配置 100% 存储于 **本地 MySQL**。
- **云端封锁**: 系统已通过 `firestore.rules` 物理锁定云端读写权限（All Denied）。Firebase 仅保留最基础的身份验证令牌功能，不存储任何业务属性。
- **内网部署**: 在医院内网服务器运行 `start-app.sh` 或 `start-app.bat` 后，全院终端通过服务器内网 IP 访问。

## 2. 手动修改默认数据库配置

如果需要直接在代码中更改默认的数据库连接信息（无需通过 UI），请修改以下文件中的初始状态对象：

1.  **登录页面默认配置**:
    - 文件路径: `src/app/login/page.tsx`
    - 修改位置: 搜索 `const [mysqlConfig, setMysqlConfig] = React.useState({ ... })`。在这里更改默认的主机 IP、端口、用户及密码。

2.  **管理页面默认配置**:
    - 文件路径: `src/app/settings/page.tsx`
    - 修改位置: 搜索 `const [formData, setFormData] = React.useState({ ... })`。在这里同步更改对应的初始值。

## 3. MySQL 数据库初始化脚本 (最新增强版)

请在您的 MySQL 8.0+ 环境中执行以下脚本。注意：`SP_SF` 表已增加了 `archiveNo` 和 `checkupNumber` 溯源字段。

```sql
CREATE DATABASE IF NOT EXISTS meditrack_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE meditrack_db;

-- 1. 患者个人档案表 (SP_PERSON)
CREATE TABLE IF NOT EXISTS SP_PERSON (
  archiveNo VARCHAR(50) PRIMARY KEY COMMENT '档案编号',
  name VARCHAR(50) COMMENT '姓名',
  gender ENUM('男', '女', '其他') COMMENT '性别',
  age INT COMMENT '年龄',
  idNumber VARCHAR(18) COMMENT '身份证号',
  organization VARCHAR(100) COMMENT '所属单位',
  address VARCHAR(200) COMMENT '联系地址',
  phoneNumber VARCHAR(20) COMMENT '电话',
  status ENUM('正常', '死亡', '无法联系') DEFAULT '正常'
);

-- 2. 重要异常结果登记表 (SP_YCJG)
CREATE TABLE IF NOT EXISTS SP_YCJG (
  id VARCHAR(100) PRIMARY KEY COMMENT '记录唯一ID',
  patientProfileId VARCHAR(50) COMMENT '关联档案号',
  checkupNumber VARCHAR(12) COMMENT '体检编号',
  checkupDate DATE COMMENT '体检日期',
  anomalyCategory ENUM('A', 'B') COMMENT '异常类别',
  anomalyDetails TEXT COMMENT '医学异常详情',
  disposalSuggestions TEXT COMMENT '处置建议',
  notifiedPerson VARCHAR(50) COMMENT '被告知人',
  notifier VARCHAR(50) COMMENT '告知人',
  notificationDate DATE COMMENT '告知日期',
  notificationTime TIME COMMENT '告知时间',
  isNotified TINYINT(1) DEFAULT 1 COMMENT '是否告知',
  isHealthEducationProvided TINYINT(1) DEFAULT 1 COMMENT '是否宣教',
  notifiedPersonFeedback TEXT COMMENT '被告知人反馈',
  isClosed TINYINT(1) DEFAULT 0 COMMENT '是否结案',
  createdAt DATETIME COMMENT '创建时间',
  FOREIGN KEY (patientProfileId) REFERENCES SP_PERSON(archiveNo)
);

-- 3. 临床随访记录表 (SP_SF - 增强溯源版)
CREATE TABLE IF NOT EXISTS SP_SF (
  id VARCHAR(100) PRIMARY KEY COMMENT '随访ID',
  associatedAnomalyId VARCHAR(100) COMMENT '关联异常记录ID',
  patientProfileId VARCHAR(50) COMMENT '患者关联 ID',
  archiveNo VARCHAR(50) COMMENT '溯源档案号',
  checkupNumber VARCHAR(12) COMMENT '溯源体检号',
  followUpResult TEXT COMMENT '随访结果详情',
  followUpPerson VARCHAR(50) COMMENT '随访人',
  followUpDate DATE COMMENT '随访日期',
  followUpTime TIME COMMENT '随访时间',
  isReExamined TINYINT(1) DEFAULT 0 COMMENT '是否复查',
  FOREIGN KEY (associatedAnomalyId) REFERENCES SP_YCJG(id)
);

-- 4. 工作人员表 (SP_STAFF)
CREATE TABLE IF NOT EXISTS SP_STAFF (
  jobId VARCHAR(50) PRIMARY KEY COMMENT '工号',
  name VARCHAR(50),
  email VARCHAR(100),
  role ENUM('管理员', '医生', '护士'),
  status ENUM('在职', '离职') DEFAULT '在职'
);

-- 5. 全局系统配置表 (SP_CONFIG)
CREATE TABLE IF NOT EXISTS SP_CONFIG (
  configKey VARCHAR(20) PRIMARY KEY DEFAULT 'default',
  appName VARCHAR(100),
  pacsUrlBase TEXT,
  pdfStoragePath TEXT,
  lastUpdated DATETIME
);
```

## 4. 运行环境要求

### Ubuntu 24.04 (推荐)
- 使用 `./start-app.sh` 启动。
- 确保系统已安装 Node.js 20+。

### Windows 终端
- **补丁**: Windows 7 必须安装 **KB2999226**。
- **启动**: 使用 `npm start` 启动生产环境。

---
*HealthInsight Registry • 医疗数据安全闭环系统*
