# HealthInsight Registry - 重要异常结果管理系统

本系统是专为医疗内网（通常为无外网、高安全要求环境）设计的体检重要异常结果登记与随访管理系统。

## 1. 运行环境要求 (Windows 7 特别说明)
临床工作站常使用 Windows 7 系统，部署前请确保满足以下条件：
- **操作系统**: Windows 7 SP1 或更高版本。
- **关键补丁**: 必须安装 **KB2999226** 补丁（通用 C 运行库），否则 Node.js 18+ 无法运行。
- **Node.js**: 推荐版本 `v18.18.0`。在 Win7 上运行需设置环境变量 `NODE_SKIP_PLATFORM_CHECK=1`。
- **内网权限**: 确保终端能通过 10699 端口访问中心 MySQL 服务器。

## 2. MySQL 服务器部署 (中心业务库)
请在内网中心服务器上创建 `meditrack_db` 数据库，并执行以下 SQL 初始化：

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

-- 5. 系统配置表
CREATE TABLE SP_CONFIG (
    configKey VARCHAR(20) PRIMARY KEY,
    appName VARCHAR(100),
    pacsUrlBase TEXT,
    pdfStoragePath TEXT,
    lastUpdated DATETIME
);
```

## 3. 离线安装与打包流程 (生产环境无网络)
由于生产环境无法连接互联网，请使用 **“中转机”** 方案：

### 第一步：在中转机（有网）上打包
1. 下载源码并进入目录：`npm install`
2. 执行生产环境编译：`npm run build`
3. 安装打包工具：`npm install -g nativefier`
4. 将本地服务封装为 EXE：
   ```bash
   nativefier "http://localhost:9002" --name "HealthInsight" --platform "windows" --arch "x64" --single-instance --internal-urls ".*"
   ```
5. 完成后，你会得到一个名为 `HealthInsight-win32-x64` 的文件夹。

### 第二步：离线迁移与安装
1. 将 `HealthInsight-win32-x64` 文件夹及编译后的整个项目源码文件夹拷贝到 U盘。
2. 在无网的临床 Win7 终端：
   - 安装离线版 Node.js v18.18.0。
   - 安装 `KB2999226` 补丁。
   - 将项目文件夹拷贝到硬盘（如 `D:\HealthApp`）。
3. 启动后台服务：在该目录下运行 `node_modules/.bin/next start -p 9002`。
4. 运行 `HealthInsight.exe` 即可进入系统。

## 4. 逻辑设计原则
- **自动注销**: 采用会话级持久化。关闭程序窗口后，登录状态立即销毁。再次启动必进登录页，保障账户安全。
- **无后台残留**: 程序窗口关闭后，相关 Node 进程将彻底释放内存，绝不驻留后台，保障老旧电脑流畅。
- **零本地缓存**: 临床数据完全实时请求中心 MySQL，确保多终端数据绝对唯一。
- **启动优化**: 已清理所有冗余配置，解决启动时“验证权限”缓慢的问题。

## 5. 常见问题
- **报错 "FirebaseError"**: 请检查登录页底部的“配置中心”，确保内网 MySQL IP 和端口配置正确。
- **显示异常图表失败**: 确保中心数据库已根据上方 SQL 完成初始化，且 `TINYINT` 字段正确映射。
