# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### [2026-05-21] 事故收尾 + 安全网建设

#### 新增
- `backup.sh` — VC 2.0 备份脚本（Git repo + MySQL + SSL + 凭证）
- `docs/discipline.md` v1.3 — 新增 §3.4 Git push铁律、备份验证、外部修改审查
- 《VC 2.0 项目全面对齐报告》— 飞书文档 ID: XvM6dccz2o7yBKxLE60cwUmFnad

#### 修复
- MySQL root密码：`Vc@2026#root`（实测确认）
- backup.sh MySQL密码：已从无效密码更正为 `Vc@2026#root`
- GitHub Token：已更新（具体值存储于 `/home/ubuntu/.netrc`）

#### Git push
- 本地 7 个 commit + 远程 3 个 commit（CI workflow / README / test）通过 rebase 合并
- `origin/main` 已同步至 `a242e2f`

#### Admin 功能盘点结论
- 页面 UI：全部 200 ✅
- FastAPI 路由：brands/categories/columns/products/accounts/logs/pipeline 全部 404 ❌
- operation_logs 表：不存在 ❌
- 已可用：/api/v1/export/{table}、/api/v1/suppliers、/api/v1/quotes、/api/v1/skus、/api/v1/health

---

### [2026-05-21] 部署验收通过（第一阶段）

#### 验收结果（16/16 通过）
- 10/10 容器全部 Running + Healthy
- MySQL 数据：suppliers 6条，std_products 33,974条，supplier_quotes 139,674条
- Nginx 安全响应头全部生效
- Admin 全部页面路由返回 200
- API Export Route /api/v1/export/suppliers 和 /api/v1/export/std_products 可用

#### 修复的问题
- nginx upstream 端口：`admin:3000` → `admin:3001`
- export_routes 未接入 main.py
- globals.css 缺失

#### Git 提交
```
0db5ede docs: update CHANGELOG with deployment verification results
e3c48d1 fix: nginx upstream ports + export_routes include + globals.css
97e6c2d fix: include export_routes router in main.py
208c368 docs: add CHANGELOG.md development log
6ac4159 audit-fix: P0 security + admin UI + tests v1
1303d93 Initial commit: VC 2.0 full codebase
```
