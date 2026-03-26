
@echo off
TITLE HealthInsight Registry - 医疗内网后端服务
echo [SYSTEM] 正在检查医疗内网运行环境...

:: 设置 Windows 7 兼容性环境变量
set NODE_SKIP_PLATFORM_CHECK=1

:: 检查 node_modules 是否存在
if not exist "node_modules\" (
    echo [ERROR] 缺少运行库文件！请确保已从中转机拷贝完整的 node_modules 目录。
    pause
    exit
)

:: 检查编译文件是否存在
if not exist ".next\" (
    echo [ERROR] 缺少编译文件！请确保已执行 npm run build。
    pause
    exit
)

echo [SUCCESS] 环境自检通过。
echo [INFO] 正在启动临床数据中心同步引擎 (Port: 9002)...
echo [INFO] 其他内网电脑可通过浏览器访问: http://%computername%:9002

:: 启动生产环境服务，监听所有网卡
npm run start

pause
