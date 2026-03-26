@echo off
title HealthInsight Registry - 医疗内网服务中心

echo ======================================================
echo    HealthInsight Registry 重要异常结果管理系统
echo ======================================================
echo [信息] 正在配置 Windows 7 临床运行环境...

:: 设置 Win7 兼容性环境变量
set NODE_SKIP_PLATFORM_CHECK=1

:: 检查 Node.js 环境
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js 环境，请先安装 node-v18.18.0-x64.msi
    pause
    exit
)

echo [信息] 正在启动医疗后端服务 (端口: 9002)...
echo [提示] 启动成功后，其他内网电脑可通过浏览器访问本机的 [IP:9002]
echo ------------------------------------------------------

:: 启动生产环境服务并监听所有网络接口
npm start

if %errorlevel% neq 0 (
    echo [错误] 服务启动失败。请确保 9002 端口未被占用。
    pause
)
