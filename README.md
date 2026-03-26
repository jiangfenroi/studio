
# HealthInsight Registry - 重要异常结果管理系统

本系统是专为医疗内网（无外网、高安全要求环境）设计的体检重要异常结果登记与随访管理系统。支持在 Windows 7 (旧式工作站) 和 Ubuntu 24.04 (新式服务器) 环境下稳定部署。

## 1. 运行环境要求

### Windows 7 终端 (旧式工作站)
- **操作系统**: Windows 7 SP1 或更高版本。
- **关键补丁**: 必须安装 **KB2999226** 补丁（通用 C 运行库），否则 Node.js 无法运行。
- **Node.js**: 推荐安装离线版 `v18.18.0`（支持 Win7 的最后一个稳定大版本）。
- **环境变量**: 启动脚本会自动处理 `NODE_SKIP_PLATFORM_CHECK=1`。

### Ubuntu 24.04 终端 (新式服务器)
- **操作系统**: Ubuntu 24.04 LTS。
- **Node.js**: 推荐 `v20.x` 或更高版本。

---

## 2. 离线安装与“一键运行”方案 (中转机方案)

由于生产环境无网络，请遵循以下部署方案：

### 第一步：在中转机（有网环境）准备
1. 进入项目源码目录，执行 `npm install` 下载所有依赖。
2. 执行 `npm run build` 生成 `.next` 生产环境编译文件夹。
3. 如果需要封装 EXE，建议使用 `nativefier` 针对 `http://127.0.0.1:9002` 进行打包。

### 第二步：离线迁移（无网环境）
1. 将包含 `node_modules`、`.next`、`package.json`、`public`、`start-app.bat` 及 `start-app.sh` 的整个文件夹拷贝到 U盘。
2. 拷贝至内网电脑（如 `D:\HealthApp`）。

### 第三步：多终端内网互联
- **服务器启动**: 在服务器电脑（如 IP 为 `172.17.126.18`，**注意：此 IP 仅为示例，请以实际为准**）上双击 `start-app.bat`。
- **多终端访问**: 只要服务器后台命令行窗口运行中，同内网的其他电脑通过浏览器输入 `http://服务器真实IP:9002` 即可直接使用，无需任何安装。

---

## 3. 开机自启动设置 (仅后台命令行)

### Windows 7 设置 (仅启动服务，不弹出浏览器)
1. 右键点击 `start-app.bat`，选择“**创建快捷方式**”。
2. 按下键盘 `Win + R` 键，输入 `shell:startup` 并回车。
3. 将刚才创建的**快捷方式**粘贴进打开的“启动”文件夹。
4. **效果**：开机进入桌面后，系统自动弹出命令行窗口并启动后台服务，不会干扰医生操作。

### Ubuntu 24.04 设置 (Systemd)
1. 创建服务文件：`sudo nano /etc/systemd/system/healthapp.service`
2. 配置 `ExecStart` 指向您的项目目录并运行 `./start-app.sh`。

---

## 4. MySQL 数据库初始化 SQL 命令

请在中心服务器 MySQL (8.0+) 中执行以下命令创建业务库与核心表：

```sql
CREATE DATABASE IF NOT EXISTS meditrack_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE meditrack_db;

-- 1. 患者个人档案表
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

-- 2. 重要异常结果登记表
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

-- 3. 临床随访记录表
CREATE TABLE IF NOT EXISTS SP_SF (
  id VARCHAR(100) PRIMARY KEY COMMENT '随访ID',
  associatedAnomalyId VARCHAR(100) COMMENT '关联异常记录ID',
  patientProfileId VARCHAR(50) COMMENT '患者档案号',
  followUpResult TEXT COMMENT '随访结果详情',
  followUpPerson VARCHAR(50) COMMENT '随访人',
  followUpDate DATE COMMENT '随访日期',
  followUpTime TIME COMMENT '随访时间',
  isReExamined TINYINT(1) DEFAULT 0 COMMENT '是否复查',
  FOREIGN KEY (associatedAnomalyId) REFERENCES SP_YCJG(id)
);

-- 4. 工作人员表
CREATE TABLE IF NOT EXISTS SP_STAFF (
  jobId VARCHAR(50) PRIMARY KEY COMMENT '工号',
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

---

## 5. 逻辑安全性
- **自动注销**: 采用会话级持久化。关闭命令行窗口或重启电脑后，登录状态立即销毁，保障临床数据安全。
- **零后台残留**: 关闭运行窗口后，所有后台服务进程将彻底释放。
- **多终端同步**: 100% 实时请求中心 MySQL，多终端访问时数据绝对同步。
