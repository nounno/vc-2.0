# VC 2.0 生产纪律 v1.6

**生效日期**: 2026-05-22
**修订内容**: v1.6 修正MySQL连接参数（容器内网访问）、更新账号密码来源、删除search API BASE误导条目、六层架构正文统一

---

## 一、部署铁律

### 1.1 容器化
- 所有VC 2.0应用服务必须运行在Docker容器内，通过docker-compose统一编排
- 禁止在宿主机直接运行任何VC 2.0应用进程
- 禁止引入PM2管理VC 2.0应用进程
- 禁止引入standalone模式部署VC 2.0应用
- 基础设施服务（Docker引擎、Nginx、MySQL、Redis）和九月Agent自身运行环境不受上述限制

### 1.2 环境变量
- 所有环境变量通过docker-compose注入，禁止依赖.env.local
- 数据库密码含特殊字符时必须URL编码（# → %23）
- **数据库主机：容器内网DNS名 `mysql`，端口 `3306`（非127.0.0.1，非3307）**
- docker-compose 中 mysql 服务**禁止暴露 ports 段**（纯内网访问，不对外网开放）

### 1.3 基础设施组件（必装）

以下组件须在研发环境搭建阶段完成部署，不得推迟至后续Phase：

| 组件 | 用途 | 部署时序 |
|------|------|----------|
| Redis Streams | Pipeline异步化消息队列 | 研发环境搭建 |
| Redis Cache | 搜索缓存、数据中心预计算缓存 | 研发环境搭建 |

> ⚠️ 违者视为研发环境未就绪，后续任务不得启动。

### 1.4 九月自身防护
绝对不可触碰：
- /home/ubuntu/.hermes/ 整个目录
- 九月自身的PM2进程
- 九月依赖的系统级工具（PM2本身、Node.js运行时）

---

## 二、验证铁律
- 任何修复或部署后，必须localhost + 外网双重验证
- 禁止凭"应该好了"判断完成
- 问题报告先贴堆栈，再给结论

---

## 三、执行纪律

### 3.1 人机分工
| 角色 | 职责 |
|------|------|
| 董事长 | 商业计划最终解释、战略方向、关键设计确认、最终验收 |
| 九月 | 任务拆解、CC调度、交付物验收、宪法合规检查 |
| CC | 写代码、调试、构建、部署、单元测试 |

### 3.2 设计先行
以下模块编码前必须先出设计文档，董事长确认后执行：
- 六层Pipeline各层接口
- 五大核心视图（每个需定义：谁用、什么场景、解决什么问题）
- AI采购助手交互设计
- 数据中心各层数据模型

### 3.3 验收标准
- 每个交付项必须引用商业计划书具体章节
- "功能跑通"不是验收标准，"商业价值实现"才是
- 验收不通过的功能不视为"已完成"

### 3.4 Git与备份铁律

#### 3.4.1 Git push 强制规则
每次本地 `git commit` 后，**必须立即 push 到远程仓库**。禁止积累未推送提交。
```bash
git commit -m "描述" && git push origin main
```

#### 3.4.2 备份恢复验证
每周至少执行一次备份可恢复性验证：
```bash
bash /home/ubuntu/vc-2.0/backup.sh
# 验证 MySQL dump 可读
gunzip -c /home/ubuntu/backups/最新日期/mysql_all.sql.gz | head -3
# 验证 Git repo 可解压
tar tzf /home/ubuntu/backups/最新日期/vc2_repo.tar.gz | head -5
```

#### 3.4.3 外部修改审查
来自 GitHub 网页、另一台机器或其他开发者的任何代码修改，**必须先 `git fetch` + `git diff` 审查变更内容**，确认无安全风险和宪法违规后方可 `git merge` 或 `git pull`。

---

### 3.5 磁盘容量管理

#### 3.5.1 磁盘容量红线
- 单个磁盘使用率 **≥ 85%** 必须立即清理
- 触发清理阈值：**80%**

#### 3.5.2 快速排查命令
```bash
# 1. 看各分区使用率
df -h /
# 2. 看 Docker 各类型空间占用
docker system df
# 3. 看 Docker 子目录明细
du -sh /var/lib/docker/* | sort -rh | head -10
```

#### 3.5.3 清理操作规程
```bash
# 步骤1：清理构建缓存（最大来源）
docker builder prune -a -f

# 步骤2：清理悬空镜像和未使用镜像
docker system prune -a -f

# 步骤3：确认结果
df -h / && docker system df
```

#### 3.5.4 定期自动清理
每周一凌晨 3:00 自动执行清理任务（Cron）：
```bash
0 3 * * 1 docker builder prune -a -f && docker system prune -a -f >> /home/ubuntu/backups/cleanup.log 2>&1
```
日志文件：`/home/ubuntu/backups/cleanup.log`

---

## 四、禁止事项
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

---

## 五、任务追踪

### 5.1 Base 填写要求

每次任务执行完成后（包括指令完成、部署、修复等），必须立即更新飞书多维表格（Base）对应记录的以下字段：

| 字段 | 填写规则 |
|------|----------|
| 模块状态 | 完成后填写"已完成"，阻塞时填"已阻塞" |
| 实际进展 | 简述本次完成内容 + 关键证据（如验证结果、输出行数等） |

> Base 地址：https://tcnp9zsrapph.feishu.cn/base/MppObtDHDarFWnsCUhRcLKpcnzg
> Base Token：MppObtDHDarFWnsCUhRcLKpcnzg
> 表名：项目全局看板（tblK5AhqXTQINjRi）
> API 工具：lark-cli base +record-upsert（每次填一条）

**填写时机**：任务完成 → Base 更新，两者同步完成，不得遗漏。**

### 5.2 填写格式示例

```bash
# 更新模块状态 + 实际进展
lark-cli base +record-upsert \
  --base-token 'MppObtDHDarFWnsCUhRcLKpcnzg' \
  --table-id 'tblK5AhqXTQINjRi' \
  --record-id '<record_id>' \
  --json '{"模块状态":"已完成","实际进展":"docker-compose up 成功，admin/supplier/web 三站均返回200"}'
```

### 5.3 重复记录处理

同一模块出现重复记录时，以最新一条为准，旧记录标注"已取消"后保留备查。

---

## 六、凭证管理

> **v1.6 新增章节**

### 6.1 唯一真源
`/home/ubuntu/collab/credentials.md` 是所有服务凭证的**唯一真源**。任何密码变更必须先更新此文件，再改数据库或其他配置。

**禁止将凭证硬编码或写入代码。**

### 6.2 VC 2.0 账号密码
> 来源：`/home/ubuntu/collab/credentials.md`

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | gaPu4lanynt7h8eaFsZs |
| 供应商 | supplier | wZ1MlJyXVYVtURXB |

密码存储方式：**bcrypt** 哈希存储，不可逆。

### 6.3 数据库凭证

| 参数 | 值 |
|------|-----|
| MySQL 主机（容器内网） | mysql |
| MySQL 端口 | 3306 |
| MySQL 用户 | valuecube |
| MySQL 密码 | Vc@2026#db |
| MySQL root 密码 | Vc@2026#root |

> ⚠️ 密码含 `#`，在 docker-compose.yml 中需 URL 编码为 `%23`。
> ⚠️ MySQL 服务**不暴露 ports 段**，仅限 Docker 内网访问。

### 6.4 密码变更流程
1. 更新 `credentials.md`
2. 生成 bcrypt 哈希：`python3 -c "from passlib.hash import bcrypt; print(bcrypt.hash('新密码'))"`
3. 更新数据库：`UPDATE auth_users SET password_hash='{hash}' WHERE username='{user}'`
4. 验证：`docker exec vc2_api python3 -c "from passlib.hash import bcrypt; print(bcrypt.verify('新密码', 'hash'))"`

---

## 七、经验教训（Phase 4 实战）

> 以下每条教训均来自实际踩坑，触发条件明确。执行任务时若遇到匹配场景，自动引用对应条目。

### 7.1 代码变更必须Rebuild镜像

**问题现象**：修改了 `datacenter/main.py` 列名，重建容器2次，错误依旧。

**根因**：`docker compose up -d --force-recreate` 只重新创建容器，不Rebuild镜像。镜像层未更新，容器内仍是旧代码。

**正确做法**：
```bash
# 代码或依赖变更 → 必须Rebuild
docker compose build {service}
docker compose up -d {service}
```

**触发条件**：任何代码修改、requirements.txt 变更、Dockerfile 变更。

---

### 7.2 Dockerfile层缓存陷阱

**问题现象**：`--no-cache` 重建镜像，但容器内仍是旧代码报错依旧。

**根因**：docker build 的 `--no-cache` 不等于"完全重新构建"。`COPY . .` 只有在构建上下文内文件 mtime 变化时才触发重新 COPY。文件内容改了但 mtime 没变时，构建层被复用。

**正确做法**：
```bash
touch /path/to/changed/file   # 强制更新 mtime
docker compose build --no-cache {service}
```

**触发条件**：手动 patch 文件后立即 rebuild。

---

### 7.3 数据库Schema与代码不一致

**问题现象**：`rules/sync` 每次返回 500，`Unknown column 'target_value' in 'where clause'`。

**根因**：`rules` 表实际列名是 `corrected_value`，但代码中 SELECT/UPDATE/INSERT 使用了 `target_value`、`rule_text`、`activated_at` 等不存在的列名。Schema 变了，代码没跟着改。

**正确做法**：
- Schema first：变更时先改数据库，再改代码
- 每次字段操作前先用 `DESCRIBE {table}` 确认实际列名
- 测试环境先跑 Schema diff

**触发条件**：数据库表结构变更后。

---

### 7.4 Next.js params类型与React版本兼容性

**问题现象**：`admin/suppliers/1` 返回 500，日志：`Cannot read properties of undefined (reading 'workers')`。

**根因**：Next.js 14.2.5 + React 18.3.1，`params` 是普通对象 `{ id: string }`，**不是** `Promise`。代码用了 `use(params)`（Next.js 15+ API），在服务端渲染时崩溃。

**正确做法**：
```tsx
// Next.js 14.x
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params  // 直接取值，不用 use()
}

// Next.js 15+ 才是 Promise
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
}
```

**触发条件**：升级 Next.js / React 版本前，先查官方文档确认 API 签名是否变更。

---

### 7.5 异步任务验证必须轮询

**问题现象**：上传文件后立即检查数据库，写入结果为空，误判功能失效。

**根因**：Pipeline 异步任务 eventually consistent，`task_id` 返回后处理仍在后台进行。

**正确做法**：
1. `POST /pipeline/parse` → 立即获得 `task_id` ✅
2. 轮询 `GET /pipeline/result/{task_id}` 等待 `status: completed`
3. 数据库验证须在任务完成后执行

**触发条件**：任何异步任务的状态查询。

---

### 7.6 MySQL跨容器连接超时

**问题现象**：`docker exec vc2_mysql mysql -u valuecube ...` 执行含 JOIN 或大表查询时频繁超时，但 `SELECT 1` 正常。

**根因**：datacenter 等服务持有长事务连接池，阻塞并发 DDL/DML 查询。

**正确做法**：
- 维护操作前先重启占用连接的容器（如 `docker compose restart datacenter`）
- 用 `--silent --batch` 减少输出缓冲
- 复杂查询使用 `docker exec` 在 MySQL 容器内执行（网络最优）

**触发条件**：维护脚本或手动数据库操作。

---

### 7.7 Build时间与后台任务管理

**问题现象**：前台执行 `docker compose build admin`，超时被系统中断。

**根因**：Node.js 镜像构建需 2-3 分钟，超出前台任务默认超时限制。

**正确做法**：
```bash
# 长任务必须后台执行
docker compose build admin &
wait  # 或用 notify_on_complete + process poll
```

**触发条件**：任何预期超过 60 秒的构建任务。

---

### 7.8 API端点编码边界条件

**问题现象**：curl 测试 `GET /search?q=格力` 返回空结果，误判搜索功能失效。

**根因**：中文 URL 编码在 shell 解析时丢失，或服务端接收时解码异常。端点本身正常（英文测试通过）。

**正确做法**：
- 先用最简输入（英文/数字）验证接口可达性
- 确认可达后再定位数据格式/编码问题
- 中文查询用 URL 编码：`q=$(python3 -c "import urllib.parse; print(urllib.parse.quote('格力'))")`

**触发条件**：任何非 ASCII 字符的 API 测试。

---

## 八、修订程序
1. 修订提案由董事长提出
2. 修订草案由九月起草，董事长确认
3. 新版本写入docs/discipline.md，旧版本归档至 docs/archive/
