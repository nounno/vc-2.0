# VC 2.0 安全与操作规范

> 源自：docs/vc2-spec.md v2.0
> 维护者：Hermes | 最后同步：2026-05-24
> 读者：CC（Claude Code）
>
> 变更记录：
> - 2026-05-24：新增第八章验证铁律（来源：Superpowers verification-before-completion）
> - 2026-05-24：引入两阶段代码审查（spec-review + code-quality-review）

---

## 一、部署铁律

### 1.1 容器化
- 所有 VC 2.0 应用服务在 Docker 容器内运行，由 docker-compose 统一编排
- 禁止在宿主机直接运行 VC 2.0 应用进程
- 禁止使用 PM2 或 standalone 模式部署

### 1.2 数据库连接
- **MySQL 主机**：`mysql`（容器内网 DNS）
- **MySQL 端口**：`3306`（不是 127.0.0.1，不是 3307）
- **密码**：`Vc@2026#db`，含 `#` 时在 docker-compose.yml 中需 URL 编码为 `%23`
- MySQL 服务不暴露 ports，仅限 Docker 内网访问

### 1.3 代码变更必须 Rebuild
```
docker compose build {service}
docker compose up -d {service}
```
修改代码后不能用 `--force-recreate` 跳过 build。

---

## 二、安全原则

### 2.1 凭证不入 Git
- `credentials.md`、`.env`、`.env.secrets` 禁止提交
- 密钥只存在于本地文件或容器环境变量
- 代码中不得硬编码密码、API Key

### 2.2 SQL 必须参数化
- 所有 SQL 查询使用参数化（`%s` 占位符）
- 禁止 f-string 拼 SQL（如 `f"SELECT * FROM users WHERE id={user_id}"`）
- 操作前用 `DESCRIBE {table}` 确认实际列名

### 2.3 端口安全
- 所有服务端口不直接暴露（docker-compose 中无 `ports:` 段）
- 外部访问统一经 Nginx 反向代理
- 全站 HTTPS 强制（HTTP → 301 → HTTPS）

### 2.4 认证分离
- 内部服务：API Key 认证
- 外部用户：JWT + httpOnly Cookie
- 密码使用 bcrypt 哈希存储

### 2.5 只读操作优先
- 能用 SELECT 就不用 UPDATE/DELETE
- 敏感数据查询后即忘，不留日志

---

## 三、Git 规范

### 3.1 提交后立即 Push
```bash
git commit -m "描述" && git push origin main
```
禁止积累未推送的 commit。

### 3.2 提交信息格式
```
<type>: <subject>
```
Type：`feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore` / `security`
Subject 不超过 50 字符。

### 3.3 外部修改审查
来自 GitHub 网页或其他开发者的代码修改，先 `git fetch` + `git diff` 审查再 merge。

---

## 四、Schema First

数据库变更顺序：**先改表结构，再改代码。**

1. `DESCRIBE {table}` 确认当前列名
2. `ALTER TABLE` 修改表结构
3. 更新代码中的字段引用
4. 验证

不要假设列名，每次操作前确认。

---

## 五、经验教训速查

### 数据库维护
- 维护操作前先重启占用连接的容器（如 `docker compose restart datacenter`）
- 复杂查询在 MySQL 容器内执行（网络最优）：`docker exec vc2_mysql mysql -u valuecube -p...`
- 使用 `--silent --batch` 减少输出缓冲

### 代码变更
- 改代码必须 rebuild 镜像（`docker compose build`，不是 `up -d`）
- 文件内容改了但 build 未生效时，`touch` 文件强制更新 mtime 再 rebuild
- Build 超 60 秒必须后台执行（`&` 或 tmux）
- __pycache__ 清理：Python 服务代码修改后清理字节码缓存

### 测试
- 先用英文/数字输入验证接口可达性，再测中文
- 中文 URL 需要编码：`python3 -c "import urllib.parse; print(urllib.parse.quote('格力'))"`
- 异步任务（Pipeline）必须轮询 `status: completed` 后再验证结果

### 磁盘容量
- 磁盘使用率 **≥ 80%** 必须立即清理（≥85% 为红线）
- 清理前先确认无运行中容器依赖将被删除的镜像

### 版本兼容
- Next.js 14.x：`params` 是普通对象，不用 `use()`（那是 Next.js 15+ 的 API）
- 升级版本前先查官方文档确认 API 签名变更

---

## 六、nginx 配置安全

- **upstream 名称**：必须用 `vc2_` 前缀全名（如 `vc2_api`、`vc2_mysql`）
- **CSP 策略**：`default-src 'self'` 会阻止 Next.js，需要配置正确的 CSP
- **排查第一步**：`docker exec vc2_nginx nginx -T` 查看完整生效配置
- **修改配置后**：必须 rebuild 镜像，不能只 reload

---

## 七、Next.js 开发规范

- **params 是普通对象**：Next.js 14.x 中 `params` 是 `{ id: string }`，**不是** Promise
  ```tsx
  // 正确
  const { id } = params
  // 错误（Next.js 15+ 才用 use()）
  const { id } = use(params)
  ```
- **API 调用**：必须用相对路径 `/api/...`，禁止跨域硬编码
- **Cookie 域**：前端自主管理认证状态，Nginx 不承担业务认证职责

---

## 八、验证铁律（Verification Before Completion）

> 来源：Superpowers verification-before-completion | 适配 VC2.0 CC 工具链

### 铁律

```
在未运行验证命令并读取实际输出之前，禁止声称任何功能"完成"、"通过"、"正常"。
```

**违反此规则等同于撒谎。** 无例外。

### 执行门

每次声称完成前，必须执行：

1. **识别**：哪个命令能证明这个声称？
2. **执行**：运行完整命令（全新执行，非缓存）
3. **读取**：完整输出，检查退出码，统计失败数
4. **验证**：输出是否证实了声称？
   - 否 → 如实报告实际状态，附证据
   - 是 → 声称 + 证据一起报告
5. **然后**才能声称成功

跳过任何步骤 = 撒谎。

### 常见声称的验证要求

| 声称 | 必须的验证 | 不充分的证据 |
|------|----------|-------------|
| 测试通过 | 本次运行的测试命令输出：0 failures | 上次运行、"应该能过" |
| 构建成功 | 构建命令：exit 0 | linter 通过、日志看起来正常 |
| Bug 修复 | 复现原问题的操作：现在通过 | 代码改了、觉得修好了 |
| 回归测试有效 | 红绿 cycle 验证 | 测试通过一次 |
| 代码符合规范 | /spec-review + /code-quality-review 均通过 | CC 报告"完成" |

### 禁止用语

以下用语在未经验证之前**禁止使用**：
- "应该"、"可能"、"看起来"
- "完成了"、"修好了"、"没问题了"
- 任何暗示成功 / 正确 / 正常的肯定表述

### rationalization 防范

| 借口 | 真相 |
|------|------|
| "应该可以了" | 运行验证命令 |
| "我有信心" | 信心 ≠ 证据 |
| "就这一次" | 无例外 |
| "CC 说成功了" | 独立验证 |
| "我累了" | 疲劳 ≠ 豁免理由 |

---

## 九、关键路径

| 路径 | 用途 |
|------|------|
| `/home/ubuntu/vc-2.0/` | 项目根目录 |
| `/home/ubuntu/vc-2.0/apps/` | 各服务代码 |
| `/home/ubuntu/vc-2.0/docker/` | Dockerfile + Nginx 配置 |
| `/home/ubuntu/vc-2.0/docs/` | 宪法 + 纪律文档 |
| `/home/ubuntu/collab/credentials.md` | 凭证唯一真源（不直接读，通过 CLAUDE.md 引用） |
| `/home/ubuntu/backups/` | 备份目录 |

---

*此文件从宪法/纪律派生，宪法变更时由 Hermes 同步更新。*
