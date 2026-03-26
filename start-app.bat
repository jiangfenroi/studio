@echo off
title HealthInsight Server - 医疗内网后端控制台
set NODE_SKIP_PLATFORM_CHECK=1
echo [INFO] 正在启动 HealthInsight Registry 医疗中心服务...
echo [INFO] 运行端口: 9002
echo [INFO] 请勿关闭此窗口，关闭窗口将停止医疗服务。
echo.
cd /d %~dp0
npm run start
pause