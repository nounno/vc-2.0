# VC 2.0 开发日志 (Development Log)

## 2026-05-21 — 第三方审计修复 v1

### 提交: `6ac4159` — audit-fix: P0 security + admin UI + tests v1

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
