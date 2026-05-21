#!/bin/bash
#============================================
# VC 2.0 备份脚本
# 备份内容：Git仓库、数据库、SSL证书、凭证目录
# 存放位置：/home/ubuntu/backups/
# 保留策略：最近30天
#============================================

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="vc2_backup_${DATE}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

mkdir -p "${BACKUP_PATH}"

# 1. Git仓库打包
echo "[1/5] 备份 Git 仓库..."
cd /home/ubuntu/vc-2.0
cd /home/ubuntu && tar czf "${BACKUP_PATH}/vc2_repo.tar.gz" vc-2.0/.git 2>&1

# 2. MySQL数据库完整dump
echo "[2/5] 备份 MySQL 数据库..."
MYSQL_CONTAINER=$(docker ps -q --filter "name=vc2_mysql")
docker exec ${MYSQL_CONTAINER} mysqldump \
    -uroot -pVc@2026#root \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --all-databases \
    | gzip > "${BACKUP_PATH}/mysql_all.sql.gz" 2>&1

# 3. SSL证书备份
echo "[3/5] 备份 SSL 证书..."
cp -r /home/ubuntu/vc-2.0/docker/ssl-backup "${BACKUP_PATH}/ssl" 2>/dev/null

# 4. 凭证目录备份
echo "[4/5] 备份凭证目录..."
tar czf "${BACKUP_PATH}/credentials.tar.gz" \
    /home/ubuntu/credentials 2>/dev/null

# 5. Docker Compose配置备份
echo "[5/5] 备份 Docker Compose 配置..."
cp /home/ubuntu/vc-2.0/docker-compose.yml "${BACKUP_PATH}/" 2>/dev/null
cp -r /home/ubuntu/vc-2.0/docker/conf.d "${BACKUP_PATH}/nginx_conf.d" 2>/dev/null

# 清理30天前旧备份
find ${BACKUP_DIR} -name "vc2_backup_*" -type d -mtime +30 -exec rm -rf {} \; 2>/dev/null

echo "=========================================="
echo "备份完成: ${BACKUP_PATH}"
echo "大小: $(du -sh ${BACKUP_PATH} | cut -f1)"
echo "=========================================="

# 验证备份可恢复性
echo ""
echo "[验证] 检查备份完整性..."
if [ -f "${BACKUP_PATH}/vc2_repo.tar.gz" ]; then
    bun_size=$(stat -c%s "${BACKUP_PATH}/vc2_repo.tar.gz" 2>/dev/null || echo "0")
    echo "  Git repo: $([ $bun_size -gt 1000 ] && echo "✓ 可用 (${bun_size} bytes)" || echo "✗ 文件异常")"
else
    echo "  Git repo: ✗ 缺失"
fi

if [ -f "${BACKUP_PATH}/mysql_all.sql.gz" ]; then
    mysql_size=$(stat -c%s "${BACKUP_PATH}/mysql_all.sql.gz" 2>/dev/null || echo "0")
    echo "  MySQL dump: $([ $mysql_size -gt 1000 ] && echo "✓ 可用 (${mysql_size} bytes)" || echo "✗ 文件异常")"
else
    echo "  MySQL dump: ✗ 缺失"
fi
