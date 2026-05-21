# VC 2.0 开发日志 (Development Log)

## 2026-05-21 — 部署验证完成 ✅

### 提交: `e3c48d1` — fix: nginx upstream ports + export_routes include + globals.css

### 验收结果（2026-05-21 22:30 CST）

| # | 验收项 | 状态 | 证据 |
|---|--------|------|------|
| 1 | 9个容器全部Running+Healthy | ✅ | admin/api/datacenter/pipeline/redis/mysql/nginx/search/supplier/web |
| 2 | MySQL数据完整 | ✅ | 33974 std_products + 139674 supplier_quotes |
| 3 | Nginx安全响应头 | ✅ | X-Frame-Options/CSP/X-Content-Type/Permissions-Policy |
| 4 | Admin UI侧边栏 | ✅ | 7分组导航正常渲染 |
| 5 | Admin全页面200 | ✅ | brands/categories/columns/products/accounts/logs/pipeline |
| 6 | API Export Routes | ✅ | /api/v1/export/suppliers + /api/v1/export/std_products → 200 |
| 7 | MySQL连接 | ✅ | datacenter/search/pipeline均通过MYSQL_PASSWORD连接 |

### 本轮修复的问题

- **nginx upstream端口错误**: admin:3000→3001, supplier:3000→3002, web:3000→3004（此前502）
- **export_routes未接入main.py**: 添加`app.include_router(export_router, prefix="/api/v1")`
- **globals.css缺失**: CC创建了基础tailwind文件
- **.env缺少MYSQL_PASSWORD**: 添加Vc@2026#db（此前所有服务空密码导致Access denied）
- **docker-compose.yml healthcheck**: supplier:3002, web:3004（此前错误查:3000）
- **.env MYSQL_PASSWORD URL编码**: Vc@2026%23db→Vc@2026#db（字面量）

### Git提交记录

```
e3c48d1 fix: nginx upstream ports + export_routes include + globals.css
97e6c2d fix: include export_routes router in main.py
208c368 docs: add CHANGELOG.md development log
6ac4159 audit-fix: P0 security + admin UI + tests v1
```

### 待验证

- [x] rebuild 后所有服务 MySQL 连接正常
- [x] admin UI 各页面可正常访问
- [x] nginx 代理路由 `/api/v1/` 正常
- [x] healthcheck 全部通过

### 修复项

| 优先级 | 任务 | 文件 |
|--------|------|------|
| P0-1 | `export_routes.py` f-string → 字典白名单 | `apps/api/export_routes.py` |
| P0-2 | 所有服务 MYSQL_PASSWORD 默认值 → 强制 env | `datacenter/main.py`, `search/main.py`, `pipeline/main.py` |
| SEC-1 | MYSQL_PASSWORD 统一 `${MYSQL_PASSWORD}` 引用 | `docker-compose.yml` (全部7服务) |
| SEC-2 | CORS `ALLOWED_ORIGINS` 强制 env | `datacenter/main.py` |
| SEC-3 | Nginx 安全响应头 | `docker/conf.d/{admin,api,supplier,web}.conf` |
| SEC-4 | api.conf `/api/v1/` 路由代理 | `docker/conf.d/api.conf` |
| FUNC-1 | 登录路径 + URL 相对路径 | `apps/admin/app/{layout,page,quality,rules,search}/page.tsx` |
| FUNC-2 | healthcheck 路径统一 | `datacenter/main.py`, `pipeline/main.py` |
| UI-shell | 共享组件 (ApiClient + PageContainer + Sidebar) | `apps/admin/app/components/` |
| UI-admin | 管理页面 (brands/categories/columns/products/accounts/logs/pipeline) | `apps/admin/app/` |
| CI | GitHub Actions CI 工作流 | `.github/workflows/ci.yml` |
| CI | deploy-check.sh 11项宪法检查 | `deploy-check.sh` |
| TESTS | pytest 冒烟测试 50+ 用例 | `apps/api/tests/` |
| DOCS | 审计追踪文档 | `docs/audit-tracking.md` |
| OTHER | `.env.secrets` 加入 `.gitignore` | `.gitignore` |

### 新增文件

```
apps/admin/.dockerignore
apps/admin/app/accounts/page.tsx
apps/admin/app/brands/page.tsx
apps/admin/app/categories/page.tsx
apps/admin/app/columns/page.tsx
apps/admin/app/components/ApiClient.tsx
apps/admin/app/components/PageContainer.tsx
apps/admin/app/components/Sidebar.tsx
apps/admin/app/logs/page.tsx
apps/admin/app/pipeline/page.tsx
apps/admin/app/products/page.tsx
apps/api/export_routes.py
apps/api/tests/__init__.py
apps/api/tests/conftest.py
apps/api/tests/test_admin_pages.py
apps/api/tests/test_api.py
apps/api/tests/test_cors.py
apps/api/tests/test_health.py
apps/api/tests/test_mysql_config.py
apps/api/tests/test_nginx_headers.py
apps/search/.dockerignore
apps/supplier/.dockerignore
apps/web/.dockerignore
backups/.monitor_state
backups/20260519/config_20260519.tar.gz
backups/20260519/db_20260519.sql.gz
backups/20260521/config_20260521.tar.gz
backups/20260521/db_20260521.sql.gz
deploy-check.sh
docs/audit-tracking.md
.github/workflows/ci.yml
```

### 统计

- 46 files changed, 3531 insertions(+), 79 deletions(-)

### 待验证

- [ ] rebuild 后所有服务 MySQL 连接正常
- [ ] admin UI 各页面可正常访问
- [ ] nginx 代理路由 `/api/v1/` 正常
- [ ] healthcheck 全部通过
