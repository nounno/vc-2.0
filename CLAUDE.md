# VC 2.0 项目规范

## 项目概述
- **项目名称**：ValueCube 2.0（VC2.0）
- **项目类型**：B2B 家电数据中台
- **部署地址**：106.53.134.119（广州服务器）
- **核心功能**：家电渠道价格数据采集、清洗、存储与API服务

## 技术架构

### 技术栈
- **前端**：Next.js 14（TypeScript）、Tailwind CSS
  - `apps/admin` — 管理后台（端口 3001）
  - `apps/supplier` — 供应商后台（端口 3002）
  - `apps/web` — 官网（端口 3004）
  - `apps/search` — 搜索服务（端口 3003）
- **后端**：Python FastAPI
  - `apps/api` — REST API（端口 8000）
  - `apps/datacenter` — 数据中心（端口 8003）
  - `apps/pipeline` — 数据流水线（端口 8002）
- **数据库**：MySQL 8.4（容器内 host=mysql，端口 3306）
- **缓存**：Redis 7
- **网关**：Nginx（容器名 vc2_nginx）
- **部署**：Docker Compose

### 目录结构
```
/home/ubuntu/vc-2.0/
├── apps/
│   ├── admin/           # 管理后台 Next.js
│   ├── supplier/        # 供应商后台 Next.js
│   ├── web/            # 官网 Next.js
│   ├── search/          # 搜索服务 Next.js
│   ├── api/             # REST API（FastAPI）
│   ├── datacenter/       # 数据中心（FastAPI）
│   ├── pipeline/        # 数据流水线（Python）
│   └── design-system/    # 设计系统
├── docker/              # Docker 配置
├── backups/             # 备份文件
├── docker-compose.yml   # 容器编排
└── .claude/             # Claude Code 配置
```

## 访问信息

### 数据库
- **Host**：`mysql`（容器内）/ `106.53.134.119`（外部）
- **Port**：3306
- **用户**：`valuecube`
- **密码**：密码见 `/home/ubuntu/collab/credentials.md`
- **Root 密码**：密码见 `/home/ubuntu/collab/credentials.md`
- **数据库名**：`valuecube`

### 服务端口
| 服务 | 容器名 | 端口 |
|------|--------|------|
| Admin | vc2_admin | 3001 |
| Supplier | vc2_supplier | 3002 |
| Search | vc2_search | 3003 |
| Web | vc2_web | 3004 |
| API | vc2_api | 8000 |
| Pipeline | vc2_pipeline | 8002 |
| Datacenter | vc2_datacenter | 8003 |
| Nginx | vc2_nginx | 80/443 |

### 域名
- `admin.ibotclaw.com` → Admin
- `supplier.ibotclaw.com` → Supplier
- `www.ibotclaw.com` / `ibotclaw.com` → Web
- `search.ibotclaw.com` → Search
- `api.ibotclaw.com` → API

### 账号
- **Admin**：用户 `admin`，密码 `gaPu4lanynt7h8eaFsZs`
- **Supplier**：用户 `supplier`，密码 `wZ1MlJyXVYVtURXB`
- 账号文件：`/home/ubuntu/collab/credentials.md`（不在 Git 内）

## 安全原则

### 铁律（违反停止操作）
1. **不手动写代码**：所有代码由 Claude Code 生成
2. **不先做再说**：必须收到明确指令后才能执行
3. **回滚需确认**：回滚前必须确认目标版本（时间点/commit）
4. **credentials 不入 Git**：`credentials.md`、`.env`、`.env.secrets` 绝对不能提交

### 数据库操作
- 必须在容器内执行（`docker exec -it vc2_api ...`）
- 生产数据库操作需二次确认
- 敏感数据查询后即忘，不留日志

### Nginx 配置
- 修改配置后必须 rebuild 镜像：`docker build -f docker/Dockerfile.nginx ...`
- 配置文件在 `docker/conf.d/`
- upstream 名称必须用 `vc2_` 前缀全名

## 协作约定

### Claude Code 使用流程
1. Hermes（我）接收任务，判断是否调度 CC
2. CC 直接读取本文件 + `.claude/rules/` 获取项目上下文
3. CC 执行任务，返回结果给我
4. 我复核结果，汇报给您

### Git 工作流
- 主分支：`main`
- 提交信息格式：`<type>: <subject>`
- 回滚必须先确认目标版本
- 生产部署需明确指令

### 部署规范
- 部署前运行 `deploy-check.sh` 预检
- 部署完成后报告服务状态
- 失败立即停止并报告

### 认证机制

**JWT + httpOnly Cookie**
- 登录：`POST /api/v1/auth/login` → `{ username, password }` → 返回 JWT + 设置 `access_token`/`vc_session` Cookie
- Cookie：`access_token`（httpOnly）、`vc_session`（httpOnly）
- Header 也接受：`Authorization: Bearer <token>`
- Token 有效期：24小时
- 表：`auth_users`（id, username, password_hash, role）

**密码验证**：bcrypt，存储 `password_hash`

### API 服务端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/auth/login` | POST | 登录 |
| `/api/v1/auth/logout` | POST | 登出 |
| `/api/v1/auth/me` | GET | 当前用户信息 |
| `/api/v1/suppliers` | GET/POST | 供应商 |
| `/api/v1/products` | GET | 产品 |
| `/api/v1/quotes` | GET | 报价 |
| `/api/v1/export` | POST | 导出 |

### Datacenter 服务端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/datacenter/health` | GET | 健康检查 |
| `/api/v1/suppliers/quality` | GET | 供应商质量分级 |
| `/api/v1/suppliers/{name}/brands` | GET | 供应商品牌分布 |
| `/api/v1/suppliers/price-tier` | GET | 供应商价格带 |
| `/api/v1/categories/price-bands` | GET | 品类价格区间 |
| `/api/v1/products` | GET | 产品列表 |
| `/api/v1/suppliers/freshness` | GET | 数据新鲜度 |
| `/api/v1/suppliers/{name}/errors` | GET | 供应商错误记录 |
| `/api/v1/summary` | GET | 数据汇总 |
| `/api/v1/corrections` | POST/GET | 纠正记录 |
| `/api/v1/corrections/summary` | GET | 纠正汇总 |

### Pipeline 服务端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/pipeline/health` | GET | 健康检查 |
| `/pipeline/parse` | POST | 提交解析任务（异步，返回 task_id） |
| `/pipeline/result/{task_id}` | GET | 查询任务结果（轮询） |
| `/pipeline/stream/info` | GET | Redis Streams 状态 |

**异步任务流程**：POST `/pipeline/parse` → 立即返回 `task_id` → 轮询 `/pipeline/result/{task_id}` 等待 `status: completed`

### 环境变量清单

| 服务 | 变量 | 值/说明 |
|------|------|---------|
| 所有 Python 服务 | `MYSQL_HOST` | `mysql`（容器内）/ `127.0.0.1`（宿主机） |
| | `MYSQL_PORT` | `3306` |
| | `MYSQL_USER` | `valuecube` |
| | `MYSQL_PASSWORD` | 密码见 `/home/ubuntu/collab/credentials.md`（# URL编码为 `%23`） |
| | `MYSQL_DATABASE` | `valuecube` |
| Pipeline/Datacenter | `REDIS_HOST` | `redis` |
| | `REDIS_PORT` | `6379` |
| Datacenter | `ALLOWED_ORIGINS` | 逗号分隔的允许域 |
| Next.js 前端 | `NEXT_PUBLIC_API_URL` | `/api/v1`（相对路径） |
| | `NEXT_PUBLIC_SEARCH_URL` | `/search` |

### deploy-check.sh 检查逻辑

**检查顺序**：
1. **MySQL 配置**：`MYSQL_HOST`、`MYSQL_PORT`、`MYSQL_USER`、`MYSQL_PASSWORD`（含特殊字符检测）
2. **Redis 配置**：`REDIS_HOST`、`REDIS_PORT`
3. **Docker Compose**：服务定义、端口映射、依赖关系
4. **网络连通性**：MySQL ping、Redis ping
5. **镜像存在性**：`docker images | grep vc2`
6. **端口占用**：检查 3306/6379/8000/3001 等端口

**通过标准**：FAILED=0，WARNINGS 可忽略

### 项目特定规则

### API 开发
- 路由文件：`apps/api/` 下按功能分文件（`products_routes.py`、`quotes_routes.py` 等）
- 必须包含 health check：`/health` 和 `/api/v1/health`
- SQL 参数化查询，禁止字符串拼接

### Next.js 开发
- 使用 `apps/design-system/` 中的设计 token
- API 地址用环境变量 `NEXT_PUBLIC_API_URL`
- 禁止在客户端代码中暴露密钥

### Datacenter / Pipeline
- Python 项目，使用 `requirements.txt` 管理依赖
- Docker 镜像无 volume 挂载
- pip 安装需加 `-i https://pypi.tuna.tsinghua.edu.cn/simple`

### 泰山协作（定时任务）
- 任务目录：`/home/ubuntu/collab/tasks/`
- 结果目录：`/home/ubuntu/collab/results/`
- 扫描间隔：5分钟 + NEW_TASK 文件即时触发
