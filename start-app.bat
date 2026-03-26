
@echo off
title HealthInsight Registry - 医疗内网启动中心
color 0A

echo =======================================================
echo    HealthInsight Registry - 重要异常结果管理系统
echo =======================================================
echo.
echo [1/3] 正在配置 Windows 7 兼容环境...
set NODE_SKIP_PLATFORM_CHECK=1

echo [2/3] 正在检查本地环境...
if not exist "node_modules" (
    color 0C
    echo ERROR: 缺失运行环境(node_modules)。请先在有网环境运行 npm install 并同步。
    pause
    exit
)

echo [3/3] 正在启动临床数据中心 (端口: 9002)...
echo.
echo 启动成功后，请不要关闭此窗口。
echo 访问地址: http://localhost:9002
echo.
echo =======================================================

npm run start

if %ERRORLEVEL% neq 0 (
    color 0C
    echo.
    echo ERROR: 程序启动失败。
    echo 请确认是否安装了 Node.js v18+ 以及 KB2999226 补丁。
    pause
)
