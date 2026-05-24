# /review — 两阶段代码审查

> 源自：Superpowers subagent-driven-development | 适配：VC2.0 CC 工具链
> 继承自：原 `.claude/commands/review.md`（单阶段审查）

## 核心原则

**规范合规优先于代码质量。** 顺序不可颠倒：
1. **第一阶段**：spec-review — 验证"做的是不是对的事"
2. **第二阶段**：code-quality-review — 验证"是不是对的做法"

---

## 两阶段流程

```
CC 任务完成
    ↓
第一阶段：/spec-review（规范合规审查）
    ↓ 通过
第二阶段：/code-quality-review（代码质量审查）
    ↓ 通过
Hermes 复核
    ↓ 通过
汇报张炜
```

---

## 第一阶段：规范合规审查

### 审查什么
- CC 声称实现的功能 → 实际代码是否支撑？
- 任务范围外是否有多余改动？
- 业务逻辑理解是否有偏差？
- 是否符合 VC2.0 规范（safety.md / CLAUDE.md）？

### 读取文件
- `.claude/commands/spec-review.md` — 完整审查流程

### 通过标准
所有检查项 ✅，无缺失、无多余、无偏差、无规范问题时通过。

---

## 第二阶段：代码质量审查

### 审查什么
- 代码组织（单一职责、文件大小）
- 可维护性（magic number、重复代码、注释质量）
- 测试覆盖
- 安全性（SQL注入、凭证泄露）
- VC2.0 专项（Docker、Python、Next.js 规范）

### 读取文件
- `.claude/commands/code-quality-review.md` — 完整审查流程

### 通过标准
- 无 Critical 问题
- Important 问题 ≤ 2 个

---

## Hermes 复核清单

两阶段审查都通过后，Hermes 复核：

- [ ] `subtype` == "success"
- [ ] `num_turns` < `max-turns`
- [ ] `git diff --stat` 改动范围符合任务约束
- [ ] 无密钥泄露（`grep` credentials / .env 关键词）
- [ ] SQL 参数化（无 f-string 拼 SQL）
- [ ] MySQL 连接：`host=mysql, port=3306`
- [ ] 无端口暴露（docker-compose 无新增 ports 段）
- [ ] spec-review 和 code-quality-review 报告已存档

---

## 审查失败处理

```
spec-review 失败 → 记录问题 → 重新调度 CC 修复 → 重走 spec-review
code-quality-review 失败 → 记录问题 → 重新调度 CC 修复 → 重走 spec-review → 重走 code-quality-review
```

**禁止**：跳过 spec-review 直接进入 code-quality-review。

---

## 相关文件

| 文件 | 用途 |
|------|------|
| `.claude/commands/spec-review.md` | 第一阶段：规范合规审查详细流程 |
| `.claude/commands/code-quality-review.md` | 第二阶段：代码质量审查详细流程 |
| `.claude/rules/safety.md` | CC 安全与操作规范（规范合规依据） |
| `.claude/rules/commit.md` | Git 提交规范 |
| `docs/vc2-spec.md` | VC2.0 规范 v2.0（战略资产、宪法依据） |
