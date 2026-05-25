#!/bin/bash
# SSL + 磁盘 + 内存检查
# 全部正常 → 静默退出 0
# 有异常 → echo 告警，退出非 0

# SSL 证书检查（对 admin.ibotclaw.com）
cert_file="/etc/nginx/ssl/admin.ibotclaw.com.pem"
if [ -f "$cert_file" ]; then
    expiry_date=$(openssl x509 -in "$cert_file" -noout -enddate 2>/dev/null | cut -d= -f2)
    expiry_ts=$(date -d "$expiry_date" +%s 2>/dev/null)
    now_ts=$(date +%s)
    days_left=$(( (expiry_ts - now_ts) / 86400 ))
    if [ "$days_left" -lt 30 ]; then
        echo "SSL WARNING: admin.ibotclaw.com expires in ${days_left} days (${expiry_date})"
    fi
fi

# 磁盘使用率
disk_usage=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$disk_usage" -ge 80 ]; then
    echo "DISK WARNING: / usage is ${disk_usage}%"
fi

# 内存可用
available_mem=$(free -m | awk '/Mem:/ {print $7}')
if [ "$available_mem" -lt 200 ]; then
    echo "MEMORY WARNING: only ${available_mem}M available"
fi

if [ -n "$(docker ps --filter "health=unhealthy" --format "{{.Names}}")" ] || \
   [ "$disk_usage" -ge 80 ] || \
   [ "$available_mem" -lt 200 ]; then
    exit 1
fi
exit 0
