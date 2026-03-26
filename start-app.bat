@echo off
set NODE_SKIP_PLATFORM_CHECK=1
echo ======================================================
echo    HealthInsight Registry 医疗内网服务 (Windows 7)
echo ======================================================
echo [INFO] 正在启动生产环境服务...
echo [HINT] 请确保已完成 npm run build 且 MySQL 服务器在线。
echo [HINT] 内网访问地址：http://localhost:9002 或 http://本机IP:9002

npm start

if %errorlevel% neq 0 (
    echo [ERROR] 服务启动失败。请检查是否安装了 KB2999226 补丁及 Node.js 18。
    pause
)
