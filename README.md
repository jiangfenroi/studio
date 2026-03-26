# HealthInsight Registry - 重要异常结果管理系统

本系统是专为医疗内网环境设计的体检重要异常结果登记与随访管理系统，支持与中心 MySQL 数据库实时双向同步。

## 1. 运行环境要求 (Windows 7 特别说明)
由于临床工作站常使用 Windows 7 系统，部署时请务必满足以下要求：
- **操作系统**: Windows 7 SP1 (需安装 KB2999226 补丁以支持现代 C++ 运行库)
- **Node.js**: 推荐版本 `v18.18.0` (这是支持现代 Next.js 的基础，Win7 可能需要使用 nvm-windows 或特定补丁版本)
- **浏览器**: Chrome 80+ 或 Edge 现代版本 (系统不兼容 IE 浏览器)
- **网络**: 需确保能够跨网段访问中心 MySQL 服务器 (默认端口 10699)

## 2. MySQL 服务器部署 (中心业务库)
请在中心服务器上创建名为 `meditrack_db` 的数据库，并执行以下 SQL 命令初始化表结构：

```sql
-- 1. 患者基本信息表
CREATE TABLE SP_PERSON (
    archiveNo VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50),
    gender ENUM('男', '女', '其他'),
    age INT,
    idNumber VARCHAR(18),
    organization VARCHAR(100),
    address TEXT,
    phoneNumber VARCHAR(20),
    status ENUM('正常', '死亡', '无法联系') DEFAULT '正常'
);

-- 2. 重要异常结果登记表
CREATE TABLE SP_YCJG (
    id VARCHAR(50) PRIMARY KEY,
    patientProfileId VARCHAR(50),
    checkupNumber VARCHAR(20),
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

-- 3. 随访记录表
CREATE TABLE SP_SF (
    id VARCHAR(50) PRIMARY KEY,
    associatedAnomalyId VARCHAR(50),
    patientProfileId VARCHAR(50),
    followUpResult TEXT,
    followUpPerson VARCHAR(50),
    followUpDate DATE,
    followUpTime TIME,
    isReExamined TINYINT(1) DEFAULT 0,
    FOREIGN KEY (associatedAnomalyId) REFERENCES SP_YCJG(id)
);

-- 4. 工作人员表
CREATE TABLE SP_STAFF (
    jobId VARCHAR(20) PRIMARY KEY,
    name VARCHAR(50),
    email VARCHAR(100),
    role ENUM('管理员', '医生', '护士'),
    status ENUM('在职', '离职') DEFAULT '在职'
);

-- 5. 系统全局配置表
CREATE TABLE SP_CONFIG (
    configKey VARCHAR(20) PRIMARY KEY,
    appName VARCHAR(100),
    pacsUrlBase TEXT,
    pdfStoragePath TEXT,
    lastUpdated DATETIME
);
```

## 3. 打包为 Windows EXE 安装文件
为了方便临床终端使用，建议使用 `Nativefier` 或 `Electron` 进行封装：

### 方法 A: 使用 Nativefier (推荐，最快)
1. 在开发机上运行：`npm install -g nativefier`
2. 执行打包命令：
   ```bash
   nativefier "http://localhost:9002" --name "HealthInsight" --platform "windows" --arch "x64" --single-instance --internal-urls ".*"
   ```
3. 该方法会将网页直接封装为桌面入口。

### 方法 B: 生产环境部署
1. 运行编译：`npm run build`
2. 启动服务：`npm start`
3. 使用 PM2 守护进程确保程序在后台稳定运行（若需开机自启）。

## 4. 逻辑设计原则
- **零本地缓存**: 临床列表、统计图表完全实时请求 MySQL，确保多终端数据绝对唯一。
- **自动注销**: 启用会话级持久化。关闭程序窗口后，登录状态自动销毁。再次启动程序必进登录页，防止他人冒用权限。
- **无后台残留**: 程序关闭后彻底释放内存，绝不驻留后台，保障 Win7 老旧电脑运行流畅。
- **强同步引擎**: 所有写操作采用 `ON DUPLICATE KEY UPDATE`，在数据库层面实现数据幂等，防止主键冲突。

## 5. 常见问题排查
- **启动缓慢**: 请检查内网 DNS 解析或 MySQL 端口连通性。本系统首页采用并发查询，响应通常在 200ms 内。
- **报错/权限受限**: 请确保已通过工号注册并输入了正确的“系统授权码”。
```