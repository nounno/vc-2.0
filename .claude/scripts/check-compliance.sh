#!/bin/bash
set -e

echo "=== VC 2.0 Compliance Check ==="
echo ""

# CHECK 1: admin/supplier middleware.ts 一致性
echo "CHECK 1: middleware.ts 一致性"
ADMIN_MATCHER=$(grep -A1 "matcher:" apps/admin/middleware.ts | tail -1 | tr -d '[:space:]')
SUPPLIER_MATCHER=$(grep -A1 "matcher:" apps/supplier/middleware.ts | tail -1 | tr -d '[:space:]')
if [ "$ADMIN_MATCHER" != "$SUPPLIER_MATCHER" ]; then
  echo "FAIL: middleware matcher 不一致"
  echo "  admin: $ADMIN_MATCHER"
  echo "  supplier: $SUPPLIER_MATCHER"
  exit 1
fi
echo "PASS: middleware matcher 一致"

# CHECK 2: 硬编码凭证扫描
echo ""
echo "CHECK 2: 硬编码凭证扫描"
FOUND=$(grep -r -E "(password|api_key|secret)\s*:\s*['\"][A-Za-z0-9!@#$%^&*()]{8,}['\"]" apps/ --include="*.ts" --include="*.tsx" --include="*.py" 2>/dev/null | grep -v "test\|spec\|mock\|example\|placeholder" || true)
if [ -n "$FOUND" ]; then
  echo "FAIL: 发现疑似硬编码凭证："
  echo "$FOUND"
  exit 1
fi
echo "PASS: 无硬编码凭证"

# CHECK 3: Nginx 安全头覆盖率
echo ""
echo "CHECK 3: Nginx 安全头覆盖率"
# 只检查包含 API 路由的 nginx conf 文件（这些需要安全头）
for conf in docker/conf.d/*.conf; do
  if [ -f "$conf" ]; then
    # 检查是否有 API 路由配置
    if grep -q "location /api" "$conf"; then
      if ! grep -q "add_header X-Frame-Options" "$conf"; then
        echo "FAIL: $conf 缺少安全头"
        exit 1
      fi
    fi
  fi
done
echo "PASS: Nginx 安全头覆盖完整"

# CHECK 4: API 路径合规（禁止裸调 /pipeline/）
echo ""
echo "CHECK 4: API 路径合规"
# 排除 .next 构建目录
FOUND=$(grep -r "['\"]\/pipeline\/" apps/ --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null | grep -v "\.next" | grep -v "api/v1" | grep -v "test\|mock\|example" || true)
if [ -n "$FOUND" ]; then
  echo "FAIL: 发现裸路径 /pipeline/ 调用（应通过 /api/v1/ 网关）："
  echo "$FOUND"
  exit 1
fi
echo "PASS: API 路径合规"

echo ""
echo "=== 全部检查通过 ==="
exit 0
