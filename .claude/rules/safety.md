# VC 2.0 安全原则

## 铁律（违反立即停止操作）

1. **不手动写代码**
   - 所有代码必须由 Claude Code 生成
   - 不在终端用手敲 sed/awk/vim 等编辑文件
   - 使用 patch/write_file 工具修改文件

2. **不先做再说**
   - 必须收到明确指令后才能执行
   - 不自行判断"应该这样做"
   - 决策优先級：商业计划书 > 宪法 > 技术最佳实践 > 经验教训

3. **回滚需确认**
   - 回滚前必须确认目标版本（时间点或 commit hash）
   - 不默认回滚到 HEAD
   - 确认格式："确认回滚到 [commit] ？"

4. **credentials 绝对不进 Git**
   - `credentials.md`、`.env`、`.env.secrets` 禁止提交
   - 密钥只能存在于本地或容器内环境变量
   - 发现即停止，报告但不执行

## 数据库安全

- **只读操作优先**：能用 SELECT 就不用 UPDATE/DELETE
- **Schema first**：变更时先改数据库，再改代码；操作前用 `DESCRIBE {table}` 确认实际列名
- **参数化查询**：禁止 SQL 字符串拼接
- **生产操作二次确认**：UPDATE/DELETE/ALTER 必须明确指令
- **敏感数据即忘**：查询到密码/密钥后不留日志
- **跨容器连接**：维护操作前先重启占用连接的容器（`docker compose restart datacenter`）
- **MySQL 密码含 #**：YAML 中必须 URL 编码为 `%23`（`Vc@2026%23db`）

## 代码安全

- 不生成包含真实密钥的代码（注释里也不许）
- 用户输入必须校验，不信任任何外部数据
- SQL 注入防护：参数化查询是唯一方式
- XSS 防护：Next.js React 自动转义，避免 dangerouslySetInnerHTML

## Docker / 镜像安全

- **代码变更必须 Rebuild**：镜像层未更新，容器内仍是旧代码
  ```bash
  docker compose build {service}
  docker compose up -d {service}
  ```
- **层缓存陷阱**：手动 patch 文件后 rebuild 前需 `touch` 强制更新 mtime
- **容器重启后验证**：必须验证网络连接（`docker network connect`）和镜像版本
- **__pycache__ 清理**：Python 服务代码修改后必须清理字节码缓存，或最彻底的 rebuild

## nginx 配置安全

- **upstream 名称**：必须用 `vc2_` 前缀全名（如 `vc2_api`、`vc2_mysql`）
- **CSP 策略**：`default-src 'self'` 会阻止 Next.js，需要配置正确的 CSP
- **排查第一步**：`docker exec nginx nginx -T` 查看完整生效配置
- **修改配置后**：必须 rebuild 镜像，不能只 reload

## Next.js 开发规范

- **params 是普通对象**：Next.js 14.x 中 `params` 是 `{ id: string }`，**不是** Promise
  ```tsx
  // 正确
  const { id } = params
  // 错误（Next.js 15+ 才用 use()）
  const { id } = use(params)
  ```
- **API 调用**：必须用相对路径 `/api/...`，禁止跨域硬编码
- **Cookie 域**：前端自主管理认证状态，Nginx 不承担业务认证职责

## 部署安全

- **生产部署必须二次确认**
- **部署前预检**：运行 `deploy-check.sh`
- **部署后验证**：localhost + 外网双重验证，**禁止**凭"应该好了"判断
- **失败处理**：立即停止，报告错误，**禁止**自行补救

## 外部 Agent 越界处理

- 泰山（DeepSeek）等外部 Agent 修改代码后，系统审计日志记录
- 发现未授权改动立即报告
- 不自行修复，先确认指令
