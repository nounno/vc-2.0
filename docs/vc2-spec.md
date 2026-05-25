# VC 2.0 规范 v2.1

**合并版**：项目宪法 v1.1 + 生产纪律 v1.6 + 部署经验 v2.1
**生效日期**：2026-05-25
**版本**：v2.1
**修订说明**：新增 16.9-16.12（Docker build 经验），修订 16.7（禁止并行 + 超时验证）。

---

## 第一章：战略资产定义

九个战略资产，九个独立Docker容器：

| 战略资产 | 架构单元 | 商业计划书依据 |
|----------|----------|----------------|
| 六层数据工厂 | pipeline | 4.2节 |
| IR统一格式 | pipeline内实现 | 4.2节 |
| 数据中心 | datacenter | 4.4节 |
| 五大核心视图 | admin | 4.3节 |
| 供应商门户 | supplier | - |
| 品牌官网 | web | - |
| AI采购助手 | search | 5.2节 |
| 业务逻辑层 | api | - |
| 学习闭环 | pipeline内实现 | 4.2节 |

**强制要求**：
- 资产之间通过API接口通信，禁止共享数据库直连
- 新增战略资产必须同时修订本规范

---

## 第二章：六层数据工厂

层级：接入层 → 格式检测层 → 列名推断层 → 语义映射层 → 实体提取层 → 质量路由层

> **v2.0 变更**：由"五层"修正为"六层"，明确第三层为列名推断（而非硬编码列名匹配）。

---

## 第三章：IR统一格式

强制字段：brand, model, category, costPrice, suggestedPrice, quantity, warehouse

---

## 第四章：数据中心

四层架构：标准化商品目录 → 供应商情报层 → 市场情报层 → 采购决策层

---

## 第五章：五大核心视图

设计哲学：从"人命令系统执行"向"系统主动引导人决策"转变。

---

## 第六章：AI采购助手

独立容器search，分三阶段实现：关键词匹配 → 结构化查询 → 自然语言理解

---

## 第七章：学习闭环

三次纠正稳定一条规则，写入Rule表

---

## 第八章：技术选型

- 前端：Next.js 14 + Shadcn UI
- 后端：TypeScript Next.js API Routes
- 数据库：MySQL 8.4
- 消息队列：Redis Streams（研发环境搭建必装）
- 缓存：Redis（搜索与数据中心预计算必装）
- 包管理：Turborepo Monorepo
- AI Agent：九月（Hermes）
- 部署：Docker全容器化 + docker-compose

---

## 第九章：域名体系

| 域名 | 用途 | 备注 |
|------|------|------|
| ibotclaw.com | 根域名 | |
| admin.ibotclaw.com | 管理后台 | → vc2_admin:3001 |
| supplier.ibotclaw.com | 供应商门户 | → vc2_supplier:3002 |
| api.ibotclaw.com | 业务API | → vc2_api:8000 |
| www.ibotclaw.com | 品牌官网 | → vc2_web:3004 |
| search.ibotclaw.com | AI采购助手 | → vc2_search:3000 |

**HTTPS**：全站强制HTTPS，证书存于 `docker/ssl-backup/`。

---

## 第十章：安全原则

- 最小权限
- 认证分离（内部API Key，外部JWT）
- 数据脱敏（供应商身份不可见）
- 审计可追溯
- 前端与后端 API 必须同域通信，Cookie 路径须与前端域一致

---

## 第十一章：部署铁律

### 11.1 容器化
- 所有VC 2.0应用服务必须运行在Docker容器内，通过docker-compose统一编排
- 禁止在宿主机直接运行任何VC 2.0应用进程
- 禁止引入PM2管理VC 2.0应用进程
- 禁止引入standalone模式部署VC 2.0应用
- 基础设施服务（Docker引擎、Nginx、MySQL、Redis）和九月Agent自身运行环境不受上述限制

### 11.2 环境变量
- 所有环境变量通过docker-compose注入，禁止依赖.env.local
- 数据库密码含特殊字符时必须URL编码（# → %23）
- **数据库主机：容器内网DNS名 `mysql`，端口 `3306`（非127.0.0.1，非3307）**
- docker-compose 中 mysql 服务**禁止暴露 ports 段**（纯内网访问）

### 11.3 基础设施组件（必装）

| 组件 | 用途 | 部署时序 |
|------|------|---------|
| Redis Streams | Pipeline异步化消息队列 | 研发环境搭建 |
| Redis Cache | 搜索缓存、数据中心预计算缓存 | 研发环境搭建 |

> ⚠️ 违者视为研发环境未就绪，后续任务不得启动。

### 11.4 九月自身防护
绝对不可触碰：
- /home/ubuntu/.hermes/ 整个目录
- 九月自身的PM2进程
- 九月依赖的系统级工具（PM2本身、Node.js运行时）

---

## 第十二章：验证与执行纪律

### 12.1 验证铁律
- 任何修复或部署后，必须localhost + 外网双重验证
- 禁止凭"应该好了"判断完成
- 问题报告先贴堆栈，再给结论

### 12.2 人机分工

| 角色 | 职责 |
|------|------|
| 董事长 | 商业计划最终解释、战略方向、关键设计确认、最终验收 |
| 九月 | 任务拆解、CC调度、交付物验收、宪法合规检查 |
| CC | 写代码、调试、构建、部署、单元测试 |

### 12.3 设计先行
以下模块编码前必须先出设计文档，董事长确认后执行：
- 六层Pipeline各层接口
- 五大核心视图（每个需定义：谁用、什么场景、解决什么问题）
- AI采购助手交互设计
- 数据中心各层数据模型

### 12.4 验收标准
- 每个交付项必须引用商业计划书具体章节
- "功能跑通"不是验收标准，"商业价值实现"才是
- 验收不通过的功能不视为"已完成"

### 12.5 Git与备份铁律

**每次本地 `git commit` 后，必须立即 push 到远程仓库。** 禁止积累未推送提交。

每周至少执行一次备份可恢复性验证：
```bash
bash /home/ubuntu/vc-2.0/backup.sh
gunzip -c /home/ubuntu/backups/最新日期/mysql_all.sql.gz | head -3
tar tzf /home/ubuntu/backups/最新日期/vc2_repo.tar.gz | head -5
```

来自 GitHub 网页、另一台机器或其他开发者的任何代码修改，**必须先 `git fetch` + `git diff` 审查变更内容**，确认无安全风险后方可合并。

---

## 第十三章：禁止事项

1. 在宿主机运行VC 2.0应用进程
2. 使用PM2管理VC 2.0应用服务
3. 使用standalone模式部署VC 2.0应用
4. 依赖.env.local传递环境变量
5. 数据库密码不URL编码
6. 硬编码列名匹配（列名推断层）
7. 战略资产之间共享数据库直连
8. 凭"应该好了"判断修复完成
9. 问题报告先下结论后贴堆栈
10. 跳过设计先行环节直接编码
11. 在系统级操作中未显式排除九月自身运行环境
12. **磁盘使用率≥85%时不清理解压上传文件**
13. **清理前不确认是否有运行中容器依赖将被删除镜像**
14. **同时运行两个 Docker build（并行 build 禁止令）**

---

## 第十四章：磁盘容量管理

### 14.1 磁盘容量红线
- 单个磁盘使用率 **≥ 85%** 必须立即清理
- 触发清理阈值：**80%**

### 14.2 快速排查命令
```bash
df -h /          # 各分区使用率
docker system df  # Docker 空间占用
du -sh /var/lib/docker/* | sort -rh | head -10  # 子目录明细
```

### 14.3 清理操作规程
```bash
# 步骤1：清理构建缓存（最大来源）
docker builder prune -a -f
# 步骤2：清理悬空镜像和未使用镜像
docker system prune -a -f
# 步骤3：确认结果
df -h / && docker system df
```

### 14.4 定期自动清理
每周一凌晨 3:00 自动执行清理任务（Cron）：
```
0 3 * * 1 docker builder prune -a -f && docker system prune -a -f >> /home/ubuntu/backups/cleanup.log 2>&1
```

---

## 第十五章：凭证管理

### 15.1 唯一真源
`/home/ubuntu/collab/credentials.md` 是所有服务凭证的**唯一真源**。任何密码变更必须先更新此文件，再改数据库或其他配置。**禁止将凭证硬编码或写入代码。**

### 15.2 VC 2.0 账号密码

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | gaPu4lanynt7h8eaFsZs |
| 供应商 | supplier | wZ1MlJyXVYVtURXB |

密码存储方式：**bcrypt** 哈希存储，不可逆。

### 15.3 数据库凭证

| 参数 | 值 |
|------|-----|
| MySQL 主机（容器内网） | mysql |
| MySQL 端口 | 3306 |
| MySQL 用户 | valuecube |
| MySQL 密码 | Vc@2026#db |
| MySQL root 密码 | Vc@2026#root |

> ⚠️ 密码含 `#`，在 docker-compose.yml 中需 URL 编码为 `%23`。
> ⚠️ MySQL 服务**不暴露 ports 段**，仅限 Docker 内网访问。

### 15.4 密码变更流程
1. 更新 `credentials.md`
2. 生成 bcrypt 哈希：`python3 -c "from passlib.hash import bcrypt; print(bcrypt.hash('新密码'))"`
3. 更新数据库：`UPDATE auth_users SET password_hash='{hash}' WHERE username='{user}'`
4. 验证：`docker exec vc2_api python3 -c "from passlib.hash import bcrypt; print(bcrypt.verify('新密码', 'hash'))"`

---

## 第十六章：经验教训

> 以下每条教训均来自实际踩坑，触发条件明确。执行任务时若遇到匹配场景，自动引用对应条目。

### 16.1 代码变更必须Rebuild镜像
**问题**：`docker compose up -d --force-recreate` 只重新创建容器，不Rebuild镜像。镜像层未更新，容器内仍是旧代码。
**正确做法**：
```bash
# 代码或依赖变更 → 必须Rebuild
docker compose build {service}
docker compose up -d {service}
```
**触发条件**：任何代码修改、requirements.txt 变更、Dockerfile 变更。

### 16.2 Dockerfile层缓存陷阱
**问题**：`--no-cache` 重建镜像，但容器内仍是旧代码报错依旧。
**根因**：`COPY . .` 只有在构建上下文内文件 mtime 变化时才触发重新 COPY。
**正确做法**：
```bash
touch /path/to/changed/file   # 强制更新 mtime
docker compose build --no-cache {service}
```
**触发条件**：手动 patch 文件后立即 rebuild。

### 16.3 数据库Schema与代码不一致
**问题**：`Unknown column 'target_value' in 'where clause'`。
**根因**：Schema 变了，代码没跟着改。
**正确做法**：Schema first，变更时先改数据库再改代码；每次字段操作前先用 `DESCRIBE {table}` 确认实际列名。
**触发条件**：数据库表结构变更后。

### 16.4 Next.js params类型与React版本兼容性
**问题**：`Cannot read properties of undefined (reading 'workers')`。
**根因**：Next.js 14.x `params` 是普通对象，不是 `Promise`。代码用了 `use(params)`（Next.js 15+ API）。
**正确做法**：Next.js 14.x 直接解构取值，不用 `use()`。
**触发条件**：升级 Next.js / React 版本前确认 API 签名。

### 16.5 异步任务验证必须轮询
**问题**：上传文件后立即检查数据库，写入结果为空，误判功能失效。
**根因**：Pipeline 异步任务 eventually consistent，`task_id` 返回后处理仍在后台进行。
**正确做法**：轮询 `GET /pipeline/result/{task_id}` 等待 `status: completed` 后再查数据库。
**触发条件**：任何异步任务的状态查询。

### 16.6 MySQL跨容器连接超时
**问题**：`docker exec vc2_mysql mysql ...` 执行含 JOIN 或大表查询时频繁超时，但 `SELECT 1` 正常。
**根因**：datacenter 等服务持有长事务连接池，阻塞并发 DDL/DML 查询。
**正确做法**：维护操作前先重启占用连接的容器；复杂查询在 MySQL 容器内执行。
**触发条件**：维护脚本或手动数据库操作。

### 16.7 Build时间与后台任务管理（v2.1 修订）
**问题**：前台执行 `docker compose build admin`，超时被系统中断；或两路 build 并行导致双方都极慢甚至 SIGKILL。
**正确做法**：
```bash
# ① 长任务必须后台执行
docker compose build {service} &
wait

# ② 禁止同时运行两个 build（并行 build 禁止令）
# 两路 build 并行会抢占服务器出口带宽，导致双方 apt-get 速度从 MB/s 降至 B/s，
# 甚至触发 buildx 内部冲突导致进程被 SIGKILL。

# ③ build 超时后必须主动查镜像状态，不凭超时判断成功/失败
docker images | grep {image_name}
# 前台超时不代表 build 失败，镜像可能已构建完成。
```
**触发条件**：任何预期超过 60 秒的构建任务；计划同时执行多个 build 之前。

### 16.8 API端点编码边界条件
**问题**：curl 测试 `GET /search?q=格力` 返回空结果，误判搜索功能失效。
**根因**：中文 URL 编码在 shell 解析时丢失。
**正确做法**：先用英文/数字验证接口可达性；中文查询用 URL 编码：`q=$(python3 -c "import urllib.parse; print(urllib.parse.quote('格力'))")`。
**触发条件**：任何非 ASCII 字符的 API 测试。

### 16.9 APT源覆盖规范（v2.1 新增）
**问题**：Dockerfile 中用 sed 追加阿里云镜像源，但 Debian slim 基础镜像的 `/etc/apt/sources.list` 内残留 `deb.debian.org` 记录。sed 只覆盖了 `sources.list.d/*.list`，没覆盖 `sources.list` 本身，导致 build 末期仍从 deb.debian.org 拉包，速度从 587KB/s 骤降至 566B/s。
**正确做法**：直接覆盖整个 sources.list，不依赖 sed 追加。
```dockerfile
# 正确：直接覆盖
RUN echo 'deb http://mirrors.aliyun.com/debian/ bookworm main non-free-firmware\n\
deb http://mirrors.aliyun.com/debian/ bookworm-updates main non-free-firmware\n\
deb http://mirrors.aliyun.com/debian-security/ bookworm-security main non-free-firmware' \
> /etc/apt/sources.list

# 错误：只 sed 追加，残留 deb.debian.org
# RUN sed -i 's|http://deb.debian.org|http://mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian*.list
```
**触发条件**：任何 Dockerfile 中修改 apt 源的操作。

### 16.10 buildx缓存损坏处理（v2.1 新增）
**问题**：并发 build 或 buildx 写缓存时 IO 争用，可能导致 build 进程被 SIGKILL(-9)，但系统 dmesg 无 OOM 日志，内存/磁盘均有大量余量。误判为资源不足。
**根因**：buildx 并发写 `/var/lib/docker/buildx` 缓存时 IO 冲突，或 cgroup 限制触发。但本例中两路 build 并行时带宽抢占是主因。
**正确做法**：
```bash
# ① 先清 buildx 缓存
docker builder prune -f

# ② 单次顺序 build，不并行
docker compose build {service}

# ③ SIGKILL 后先清缓存再重试
docker builder prune -f
docker compose build {service}
```
**触发条件**：build 进程异常退出（exit code -9）；两路 build 互相抢带宽导致双方极慢。

### 16.11 前台超时后台继续（v2.1 新增）
**问题**：`docker compose build` 前台 timeout=600s 超时返回，但后台 build 进程继续运行，最终镜像确实构建完成。误判 build 失败。
**正确做法**：超时后主动查 `docker images` 确认实际状态。
```bash
# 超时后查镜像，不凭超时判断
docker images | grep {image_name}
# 如果镜像存在，说明 build 已完成，只需重启容器
docker compose up -d {service}
```
**触发条件**：`docker compose build` 返回 exit code 124（timeout）；进程被 SIGKILL。

### 16.12 操作失败先排查根因（v2.1 新增）
**问题**：`apt-get` 失败后立刻重试，不查根因；build 超时后反复 rebuild；API 返回 500 后换参数重试。反复重试消耗时间和带宽，但不解决真正问题。
**正确做法**：操作失败时，先分析是网络问题、资源问题、配置问题还是代码问题，定位根因后再行动。常见快速排查：
```bash
# apt-get 慢 → 查 apt 源配置
cat /etc/apt/sources.list
ls /etc/apt/sources.list.d/

# build 慢 → 查网络速度
curl -sI http://mirrors.aliyun.com/ | head -1

# 进程消失 → 查 dmesg
dmesg | grep -i 'killed\|oom\|memory' | tail -10

# 镜像异常 → 查磁盘和 buildx 缓存
df -h /var/lib/docker
docker builder prune -f
```
**触发条件**：任何重复失败的操作（同一操作失败 2 次以上）。

---

## 第十七章：任务追踪

### 17.1 Base 填写要求
每次任务执行完成后，必须立即更新飞书多维表格对应记录的以下字段：

| 字段 | 填写规则 |
|------|---------|
| 模块状态 | 完成后填写"已完成"，阻塞时填"已阻塞" |
| 实际进展 | 简述本次完成内容 + 关键证据（如验证结果、输出行数等） |

> Base 地址：https://tcnp9zsrapph.feishu.cn/base/MppObtDHDarFWnsCUhRcLKpcnzg
> Base Token：MppObtDHDarFWnsCUhRcLKpcnzg
> 表名：项目全局看板（tblK5AhqXTQINjRi）
> API 工具：lark-cli base +record-upsert

**填写时机**：任务完成 → Base 更新，两者同步完成，不得遗漏。

### 17.2 填写格式示例
```bash
lark-cli base +record-upsert \
  --base-token 'MppObtDHDarFWnsCUhRcLKpcnzg' \
  --table-id 'tblK5AhqXTQINjRi' \
  --record-id '<record_id>' \
  --json '{"模块状态":"已完成","实际进展":"docker-compose up 成功，admin/supplier/web 三站均返回200"}'
```

### 17.3 重复记录处理
同一模块出现重复记录时，以最新一条为准，旧记录标注"已取消"后保留备查。

---

## 第十八章：修订程序

1. 修订提案由董事长提出
2. 修订草案由九月起草，董事长确认
3. 新版本写入 docs/vc2-spec.md，旧版本归档至 docs/archive/

---

## 附录：v2.1 修订明细

| 编号 | 类型 | 位置 | 变更内容 |
|------|------|------|---------|
| 1 | 新增 | 第十三章禁止事项 | 新增第14条：同时运行两个 Docker build 禁止 |
| 2 | 修订 | 16.7 | 增加"禁止并行"和"超时后查镜像"两条 |
| 3 | 新增 | 16.9 | APT源覆盖规范（经验 A） |
| 4 | 新增 | 16.10 | buildx缓存损坏处理（经验 B/C） |
| 5 | 新增 | 16.11 | 前台超时后台继续（经验 D） |
| 6 | 新增 | 16.12 | 操作失败先排查根因（经验 E + VC2.0 宪法 8.4） |
