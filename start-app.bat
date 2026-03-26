@echo off
title HealthInsight Registry - 医疗内网后端启动器
echo ===================================================
echo   HealthInsight Registry - 重要异常结果管理系统
echo ===================================================
echo.
echo [1/3] 正在配置 Windows 7 兼容性环境...
set NODE_SKIP_PLATFORM_CHECK=1

echo [2/3] 正在检测本地 Node.js 环境...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js v18.18.0 离线包。
    pause
    exit
)

echo [3/3] 正在启动临床后端服务 (端口: 9002)...
echo 请勿关闭此窗口，关闭此窗口将停止服务并自动注销。
echo.
npm start
if %errorlevel% neq 0 (
    echo [提示] 生产环境尚未编译，尝试以开发模式启动...
    npm run dev
)

pause