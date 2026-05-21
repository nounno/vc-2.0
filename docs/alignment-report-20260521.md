# VC 2.0 项目全面对齐报告（终版）

**编制时间**：2026-05-21 | **编制人**：九月 Agent | **版本**：v1.0 | **状态**：最终版

> 本报告为最终版本，经三轮核查（事故收尾、安全网建设、Admin API补齐）后确认全部内容准确。作为项目历史快照和知识基线留存。

---

## 一、宪法与纪律文件状态

| 文件 | 路径 | 版本 | 状态 |
|------|------|------|------|
| 宪法 | /home/ubuntu/vc-2.0/docs/constitution.md | v1.0 | 现行 |
| 生产纪律 | /home/ubuntu/vc-2.0/docs/discipline.md | **v1.4 最新** | 现行 |
| 审计追踪 | /home/ubuntu/vc-2.0/docs/audit-tracking.md | v1.0 | 现行 |
| CHANGELOG | /home/ubuntu/vc-2.0/docs/CHANGELOG.md | v1.0 | 现行 |
| Skills | /home/ubuntu/.hermes/skills/vc-workflows/ | v1.0 | 现行 |

### 生产纪律 v1.4 变更

v1.3 基础上新增：

- **3.4 Git与备份铁律**：commit后立即push、每周备份验证、外部修改审查
- **3.5 磁盘容量管理**：红线85%、触发阈值80%、排查命令、清理规程、自动cron
- **禁止事项新增12、13条**

---

## 二、容器与基础设施

### 2.1 容器健康（10/10 全部Healthy）

```
vc2_admin      - Admin（Next.js）      - Healthy
vc2_api        - FastAPI（业务逻辑）   - Healthy
vc2_datacenter - 数据中心              - Healthy
vc2_mysql      - MySQL 8.4            - Healthy
vc2_nginx      - 反向代理+安全头      - Healthy
vc2_pipeline   - 数据工厂              - Healthy
vc2_redis      - 缓存                 - Healthy
vc2_search     - AI采购助手            - Healthy
vc2_supplier   - Supplier Portal       - Healthy
vc2_web        - 官网                 - Healthy
```

### 2.2 磁盘状态

| 指标 | 清理前 | 清理后 |
|------|--------|--------|
| 使用率 | 91% (51G/59G) | **54% (31G/59G)** |
| Build Cache | 22.81 GB | **0 GB** |
| Images | 25.49 GB | **3.94 GB** |

**自动清理**：每周一凌晨3:00 | 日志：/home/ubuntu/backups/cleanup.log

---

## 三、数据库状态

| 表名 | 记录数 | 说明 |
|------|--------|------|
| suppliers | 6 | 供应商主数据 |
| std_products | 33,974 | 标准商品目录 |
| supplier_quotes | 139,674 | 供应商报价（核心数据资产） |
| brand_aliases | 9 | 品牌别名映射 |
| category_price_bands | 7 | 品类价格带 |
| correction_logs | 2 | 数据订正日志 |
| admins | 1 | 管理员账号 |
| column_mappings | 0 | 列名映射配置（本次新建） |
| operation_logs | 0 | 操作日志（本次新建） |

### 密码体系（实测确认）

| 用途 | 用户名 | 密码 |
|------|--------|------|
| 应用连接 | valuecube | Vc@2026#db |
| Root/mysqldump | root | Vc@2026#root |

---

## 四、Admin管理功能（本次完成）

### 4.1 后端API路由（11/11 全部200）

| 端点 | 功能 | 数据来源 | 状态 |
|------|------|----------|------|
| GET /api/v1/suppliers/quality | 品牌管理 | suppliers表 | 200 |
| GET /api/v1/categories/price-bands | 品类管理 | category_price_bands表 | 200 |
| GET /api/v1/columns | 字段管理 | column_mappings表 | 200 |
| GET /api/v1/products | 商品管理 | std_products表 | 200 |
| GET /api/v1/admin/accounts | 账号列表 | admins表 | 200 |
| GET /api/v1/admin/accounts/stats | 账号统计 | admins表聚合 | 200 |
| GET /api/v1/admin/logs | 操作日志 | operation_logs表 | 200 |
| GET /api/v1/admin/logs/stats | 日志统计 | operation_logs聚合 | 200 |
| GET /api/v1/pipeline/stats | Pipeline统计 | correction_logs聚合 | 200 |
| GET /api/v1/pipeline/tasks | Pipeline任务 | correction_logs批次 | 200 |
| GET /api/v1/pipeline/logs | Pipeline日志 | operation_logs | 200 |

### 4.2 新建表

- **operation_logs**：操作日志（本次新建）
- **column_mappings**：列名映射配置（本次新建）

### 4.3 已验证真实数据样例

**供应商质量数据**

| 供应商 | 品牌数 | 质量评分 |
|--------|--------|----------|
| 大客户报价表 | 67 | 98.5 |
| test_pipeline.xlsx | 0 | 93.6 |
| UNKNOWN | 57 | 92.2 |
| 南宁恒升电器 | 22 | 69.2 |
| 南宁圣珀电器 | 30 | 61.0 |

**品类价格带**

| 品类 | 价格区间 | 样本数 |
|------|----------|--------|
| REFRIGERATOR | 214 - 24,149 | 14,210 |
| DRYER | 70 - 652,110 | 4,391 |
| FREEZER | 129 - 3,549 | 205 |
| DISHWASHER | 2,917 - 1,020,116 | 31 |

---

## 五、GitHub状态

所有提交已推送至 origin/main

| Commit | 内容 |
|--------|------|
| f94ab23 | feat: implement admin API routes for all 7 management modules |
| 9480458 | docs: add CHANGELOG.md for project closure and safety net |
| a242e2f | docs: add v1.3 discipline - Git push + backup verification |

---

## 六、凭证与关键地址

| 项目 | 值 |
|------|-----|
| GitHub仓库 | https://github.com/nounno/vc-2.0 |
| 飞书Base | https://tcnp9zsrapph.feishu.cn/base/MppObtDHDarFWnsCUhRcLKpcnzg |
| 本报告（飞书） | https://tcnp9zsrapph.feishu.cn/docx/XvM6dccz2o7yBKxLE60cwUmFnad |
| 部署服务器 | 106.53.134.119 |
| API端口 | 8000 |
| Admin端口 | 3001 |
| 备份脚本 | /home/ubuntu/vc-2.0/backup.sh |

---

## 七、待完成事项

- [ ] 前端浏览器验证（Admin各页面数据渲染）
- [ ] lark-cli更新（1.0.32 to 1.0.35，低优先级）
- [ ] Base任务追踪记录填写

---

**报告版本**：终版 v1.0 | **最后更新**：2026-05-21
