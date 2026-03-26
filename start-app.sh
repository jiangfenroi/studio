#!/bin/bash

# HealthInsight Registry - Ubuntu 24.04 启动脚本

echo "======================================================"
echo "   HealthInsight Registry 医疗内网服务 (Ubuntu)"
echo "======================================================"
echo "[INFO] 正在启动生产环境服务..."

# 确保在项目根目录运行
cd "$(dirname "$0")"

# 启动服务并监听所有 IP
npm start

if [ $? -ne 0 ]; then
    echo "[ERROR] 服务启动失败，请检查 Node.js 路径及端口占用。"
    exit 1
fi
