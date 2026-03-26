@echo off
TITLE HealthInsight Registry - 医疗内网后端服务
COLOR 0A

:: 设置 Win7 兼容性环境变量
SET NODE_SKIP_PLATFORM_CHECK=1

echo ======================================================
echo    HealthInsight Registry 医疗内网服务启动工具
echo ======================================================
echo [INFO] 正在建立内网临床数据链路...
echo [INFO] 服务器监听地址: http://0.0.0.0:9002
echo [INFO] 针对 Windows 7 环境已应用运行库补丁兼容模式
echo ------------------------------------------------------
echo [HINT] 运行此窗口期间，内网其他电脑可访问本机 IP。
echo [HINT] 关闭此窗口将停止所有医疗服务。
echo ------------------------------------------------------

:: 启动生产环境
npm start

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] 服务启动失败！
    echo 请确认是否已安装 Node.js 和 KB2999226 补丁。
    pause
)
