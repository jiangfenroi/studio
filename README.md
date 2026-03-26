
# HealthInsight Registry - 重要异常结果管理系统

本系统是专为医疗内网（无外网、高安全要求环境）设计的体检重要异常结果登记与随访管理系统。

## 1. 运行环境要求 (Windows 7 特别说明)
临床工作站常使用 Windows 7 系统，部署前请确保满足以下条件：
- **操作系统**: Windows 7 SP1 或更高版本。
- **关键补丁**: 必须安装 **KB2999226** 补丁（通用 C 运行库），否则 Node.js 无法运行。
- **Node.js**: 推荐安装离线版 `v18.18.0`（支持 Win7 的最后一个稳定大版本）。
- **环境变量**: 必须设置 `NODE_SKIP_PLATFORM_CHECK=1`（提供的 `start-app.bat` 脚本已包含）。

## 2. 离线安装与“一键运行”方案
由于生产环境无网络，请遵循以下 **“中转机”** 部署方案：

### 第一步：在中转机（有网环境）准备
1. 进入项目源码目录。
2. 执行 `npm install` 下载所有依赖。
3. 执行 `npm run build` 生成 `.next` 生产环境编译文件夹。

### 第二步：离线迁移（无网环境）
1. 将包含 `node_modules`、`.next`、`package.json`、`public` 及其根目录下所有文件的整个文件夹拷贝到 U盘。
2. 拷贝至无网电脑的 `D:\HealthApp` 目录下。

### 第三步：一键启动与多机互联
- **双击根目录下的 `start-app.bat`**：
  - 它会自动处理 Win7 兼容性，仅启动命令行服务后台，不会自动弹出浏览器。
  - 会在 `9002` 端口启动服务，并监听 **0.0.0.0**（所有网卡）。
- **内网他机访问**: 同一局域网内的其他电脑，只需在浏览器输入服务器 IP（例如 `http://172.17.126.18:9002`）即可直接使用系统。
- **防火墙配置**: 请确保服务器电脑的防火墙已在 **“入站规则”** 中放行 TCP **9002** 端口。

## 3. 设置 Windows 7 开机自启动 (Important!)
为了方便医生使用，可设置电脑开机自动启动医疗后端服务：
1. 右键点击项目根目录下的 `start-app.bat`，选择“**创建快捷方式**”。
2. 按下键盘 `Win + R` 键，输入 `shell:startup` 并回车。
3. 在打开的“启动”文件夹窗口中，将刚才创建的**快捷方式**粘贴进去。
4. **效果**：下次电脑开机进入桌面后，系统会自动弹出命令行窗口并启动医疗后台。医生无需手动运行任何命令，直接在浏览器打开系统地址即可使用。

## 4. MySQL 数据库初始化
请在中心服务器上创建 `meditrack_db`，并初始化以下核心表结构：

```sql
-- 患者信息表
CREATE TABLE SP_PERSON (
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

-- 重要异常结果登记表
CREATE TABLE SP_YCJG (
  id VARCHAR(100) PRIMARY KEY,
  patientProfileId VARCHAR(50),
  checkupNumber VARCHAR(12),
  checkupDate DATE,
  anomalyCategory ENUM('A', 'B'),
  anomalyDetails TEXT,
  disposalSuggestions TEXT,
  isNotified TINYINT(1),
  notifiedPerson VARCHAR(50),
  notifier VARCHAR(50),
  notificationDate DATE,
  notificationTime TIME,
  notifiedPersonFeedback TEXT,
  isClosed TINYINT(1) DEFAULT 0,
  createdAt DATETIME,
  FOREIGN KEY (patientProfileId) REFERENCES SP_PERSON(archiveNo)
);

-- 随访记录表
CREATE TABLE SP_SF (
  id VARCHAR(100) PRIMARY KEY,
  associatedAnomalyId VARCHAR(100),
  patientProfileId VARCHAR(50),
  followUpResult TEXT,
  followUpPerson VARCHAR(50),
  followUpDate DATE,
  followUpTime TIME,
  isReExamined TINYINT(1),
  FOREIGN KEY (associatedAnomalyId) REFERENCES SP_YCJG(id)
);
```

## 5. 逻辑安全设计
- **自动注销**: 采用会话级持久化。关闭程序命令行窗口或重启电脑后，登录状态立即销毁。
- **无后台残留**: 关闭 `start-app.bat` 运行窗口后，所有 Node 进程将彻底释放，杜绝后台静默运行导致的卡顿。
- **零本地缓存**: 临床数据 100% 实时请求中心 MySQL，确保内网多终端数据绝对统一。
