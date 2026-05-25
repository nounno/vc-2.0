#!/bin/bash
# 备份验证：最新 mysql dump 文件必须 > 100KB
# 正常 → 静默退出 0
# 异常 → echo 告警，退出非 0

latest_dump=$(ls -d /home/ubuntu/backups/vc2_backup_*/mysql_all.sql.gz 2>/dev/null | sort -r | head -1)
if [ -z "$latest_dump" ]; then
    echo "BACKUP ERROR: no mysql dump file found"
    exit 1
fi

size=$(stat -c%s "$latest_dump" 2>/dev/null)
size_kb=$(( size / 1024 ))

if [ "$size_kb" -lt 100 ]; then
    echo "BACKUP WARNING: $latest_dump is only ${size_kb}KB (< 100KB)"
    exit 1
fi

echo "BACKUP OK: $latest_dump (${size_kb}KB)"
exit 0
