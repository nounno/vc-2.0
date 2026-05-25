# VC 2.0 开发日志 (Development Log)

## 2026-05-24 — 管理后台 API 路由修复 ✅

### 问题
Nginx admin.conf 把 `/api/v1/` 全打到 datacenter:8003，但前端调用的路径和后端实际路由不匹配。

### 修复内容

**1. Nginx admin.conf 路由拆分**
- `/api/v1/admin/*` → `vc2_api:8000`（admin_routes.py）
- `/api/v1/pipeline/*` → `vc2_api:8000`（pipeline stats）
- `/api/v1/datacenter/*` → `vc2_datacenter:8003`（rewrite 去前缀：`/api/v1/datacenter/X` → `/datacenter/X`）
- `/api/v1/{quotes,suppliers,products}` → `vc2_datacenter:8003`
- `/api/v1/auth/*` → `vc2_api:8000`

**2. datacenter 镜像 rebuild**
- 根因：build context 传输了 2.8GB（DOCKERFILE 在 docker/ 但 context 是 root）
- 修复：新建 `.dockerignore` 排除大目录 + 修正 COPY 路径（`apps/datacenter/`）
- 效果：build 时间 300s+ → 0.56s，context 2.8GB → 202B

**3. nginx rewrite 500 问题**
- `set $upstream` + `proxy_pass http://$upstream` + `proxy_redirect default` 不兼容
- 改用标准 rewrite 语法（`rewrite ... break` + 固定 `proxy_pass`）+ `proxy_redirect off`

### 验收结果（2026-05-24 13:42 CST）

| # | 验收项 | 状态 | 证据 |
|---|--------|------|------|
| 1 | GET /api/v1/datacenter/stats/overview | ✅ 200 | `{"total_products":33974,"total_suppliers":12,"total_quotes":139674,...}` |
| 2 | GET /api/v1/datacenter/quality/overview | ✅ 200 | `{"today_total":0,"high_quality":0,...}` |
| 3 | GET /api/v1/admin/accounts/stats | ✅ 200 | `{"total_accounts":1,"active_accounts":1,...}` |
| 4 | GET /api/v1/admin/logs/stats | ✅ 200 | `{"total":1,"by_level":{"INFO":1},...}` |
| 5 | GET /api/v1/pipeline/stats | ✅ 200 | `{"total_tasks":4,"running_tasks":4,...}` |

**通过率：5/5**

### 待处理
- [x] datacenter 镜像 rebuild 超时问题 — 已解决（见下方）

### 附：datacenter 镜像 rebuild 超时排查

**现象：** `docker build -f docker/Dockerfile.datacenter` 超时（>300s）

**根因：** Dockerfile 在 `docker/` 但 context 是 vc-2.0 root（`docker build -f ... .`），传输了整个 2.8GB 目录（apps/admin 1.1G + web 686M + search 699M + supplier 373M + 缓存）

**修复：**
1. 新建 `.dockerignore`，排除 apps/ 下各 app 目录、backups/、.git/、node_modules 等
2. 修正 Dockerfile.datacenter 的 COPY 路径：`requirements.txt` → `apps/datacenter/requirements.txt`，`.` → `apps/datacenter/`

**效果：** build 时间 300s+ → **0.56s**，context 2.8GB → **202B**

---

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
