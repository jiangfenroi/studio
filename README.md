
# HealthInsight Registry - 重要异常结果管理系统

本系统是专为医疗内网（无外网、高安全要求环境）设计的体检重要异常结果登记与随访管理系统。支持在 Windows 7 (旧式工作站) 和 Ubuntu 24.04 (新式服务器) 环境下部署。

## 1. 运行环境要求

### Windows 7 终端 (旧式工作站)
- **操作系统**: Windows 7 SP1 或更高版本。
- **关键补丁**: 必须安装 **KB2999226** 补丁（通用 C 运行库），否则 Node.js 无法运行。
- **Node.js**: 推荐安装离线版 `v18.18.0`（支持 Win7 的最后一个稳定大版本）。
- **环境变量**: 必须设置 `NODE_SKIP_PLATFORM_CHECK=1`。

### Ubuntu 24.04 终端 (新式服务器)
- **操作系统**: Ubuntu 24.04 LTS。
- **Node.js**: 推荐 `v20.x` 或更高版本。
- **依赖**: 确保已安装 `build-essential`（离线环境建议提前下载包）。

## 2. 离线安装与“一键运行”方案 (中转机方案)

由于生产环境无网络，请遵循以下部署方案：

### 第一步：在中转机（有网环境）准备
1. 进入项目源码目录。
2. 执行 `npm install` 下载所有依赖。
3. 执行 `npm run build` 生成 `.next` 生产环境编译文件夹。

### 第二步：离线迁移（无网环境）
1. 将包含 `node_modules`、`.next`、`package.json`、`public`、`start-app.bat` 及 `start-app.sh` 的整个文件夹拷贝到 U盘。
2. 拷贝至内网电脑（如 `D:\HealthApp` 或 `/opt/health-app`）。

### 第三步：多平台一键启动
- **Windows 7**: 双击 `start-app.bat`。它会自动处理 Win7 兼容性并在 `9002` 端口启动服务。
- **Ubuntu 24.04**: 执行 `chmod +x start-app.sh && ./start-app.sh`。
- **内网互联 (示例)**: 假设启动服务的电脑内网 IP 为 `172.17.126.18`（**注意：此 IP 仅为示例，请以您实际部署电脑的真实内网 IP 为准**），其他内网电脑通过浏览器输入 `http://您的实际IP:9002` 即可直接使用，无需安装任何插件。

## 3. 开机自启动设置 (仅启动后台命令行)

### Windows 7 设置
1. 右键点击 `start-app.bat`，选择“**创建快捷方式**”。
2. 按下键盘 `Win + R` 键，输入 `shell:startup` 并回车。
3. 将刚才创建的**快捷方式**粘贴进打开的“启动”文件夹。
4. **效果**：开机进入桌面后，系统自动弹出命令行窗口并启动后台服务，不会干扰医生操作，且不自动弹出浏览器。

### Ubuntu 24.04 设置 (Systemd)
1. 创建服务文件：`sudo nano /etc/systemd/system/healthapp.service`
2. 填入以下内容：
   ```ini
   [Unit]
   Description=HealthInsight Registry Service
   After=network.target

   [Service]
   Type=simple
   User=your_username
   WorkingDirectory=/opt/health-app
   ExecStart=/usr/bin/npm start
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```
3. 启用服务：`sudo systemctl enable healthapp && sudo systemctl start healthapp`

## 4. MySQL 数据库初始化
请在内网中心服务器上创建 `meditrack_db`，并初始化以下核心表结构。**注意：MySQL 主机地址请在系统“配置中心”中根据实际内网环境修改。**

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

## 5. 逻辑安全与性能设计
- **自动注销**: 采用会话级持久化。关闭程序命令行窗口或重启电脑后，登录状态立即销毁。
- **无后台残留**: 关闭运行窗口后，所有服务进程将彻底释放，杜绝占用系统资源。
- **零本地缓存**: 数据 100% 实时请求中心 MySQL，多终端访问时数据绝对同步。
