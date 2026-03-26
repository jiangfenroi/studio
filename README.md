
# HealthInsight Registry - 重要异常结果管理系统

本系统是专为医疗内网（通常为无外网、高安全要求环境）设计的体检重要异常结果登记与随访管理系统。

## 1. 运行环境要求 (Windows 7 特别说明)
临床工作站常使用 Windows 7 系统，部署前请确保满足以下条件：
- **操作系统**: Windows 7 SP1 或更高版本。
- **关键补丁**: 必须安装 **KB2999226** 补丁（通用 C 运行库），否则 Node.js 18+ 无法运行。
- **Node.js**: 推荐版本 `v18.18.0`。
- **环境变量**: 必须设置 `NODE_SKIP_PLATFORM_CHECK=1`。

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
1. 下载源码：`git clone` 或 拷贝源码。
2. 安装依赖：`npm install`。
3. 执行生产编译：`npm run build`。
4. 打包为 EXE 壳（可选）：
   ```bash
   npm install -g nativefier
   nativefier "http://localhost:9002" --name "HealthInsight" --platform "windows" --arch "x64" --single-instance
   ```

### 第二步：离线迁移与安装
1. 将源码文件夹（包含 `node_modules` 和 `.next`）整体拷贝到 U盘。
2. 在无网的 Windows 7 终端：
   - 安装离线版 **Node.js v18.18.0**。
   - 安装 **KB2999226** 补丁。
   - 将文件夹拷贝到 `D:\HealthApp`。

### 第三步：更方便的启动方式 (推荐)
我们在根目录提供了 `start-app.bat` 脚本，双击即可一键启动：
- 自动跳过平台检查。
- 自动在 9002 端口开启后台服务。
- 启动后，直接在浏览器访问 `http://localhost:9002` 即可。

## 4. 逻辑设计原则
- **自动注销**: 采用会话级持久化。关闭程序窗口后，登录状态立即销毁。再次启动必进登录页，保障账户安全。
- **无后台残留**: 程序窗口关闭后，手动关闭命令行窗口（或退出 EXE），相关 Node 进程将彻底释放内存，绝不驻留后台。
- **零本地缓存**: 临床数据完全实时请求中心 MySQL，确保多终端数据绝对唯一。
- **启动优化**: 已清理所有冗余配置，解决启动时“验证权限”缓慢的问题。

## 5. 常见问题
- **运行报错 "Unsupported platform"**: 请确保是通过 `start-app.bat` 启动，或手动设置了 `NODE_SKIP_PLATFORM_CHECK=1`。
- **图表加载失败**: 确保 MySQL 已根据上方 SQL 初始化，且终端能访问服务器的 10699 端口。
