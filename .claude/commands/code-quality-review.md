# /code-quality-review — 代码质量审查

> 来源：Superpowers subagent-driven-development / code-quality-reviewer-prompt.md
> 适配：Hermes 调度 CC 执行

## 触发时机

**只有 spec-review 通过后才能执行**。禁止跳过规范合规直接进入代码质量审查。

## 前置条件

- spec-review 已通过（无缺失、无多余、无偏差）
- CC 提供了 git commit SHA（BASE_SHA = 任务前，HEAD_SHA = 任务后）

## 执行步骤

### 1. 获取改动范围

```bash
cd /home/ubuntu/vc-2.0
git diff {BASE_SHA}..{HEAD_SHA} --stat
```

### 2. 逐文件质量分析

对每个改动的文件，核查：

**代码组织：**
- [ ] 每个文件职责单一，接口清晰？
- [ ] 文件是否过于臃肿（本次改动带来的增量是否合理）？
- [ ] 是否遵循项目既有模式（Next.js / FastAPI）？

**可维护性：**
- [ ] 有无硬编码的值（magic number）？
- [ ] 重复代码是否抽取为公共函数？
- [ ] 注释是否说明"为什么"而非"是什么"？

**测试覆盖：**
- [ ] 新功能是否有对应测试？
- [ ] 测试是否真正验证功能（而非空测试）？

**安全性：**
- [ ] 是否引入 SQL 注入风险？
- [ ] 是否引入凭证泄露风险？
- [ ] 用户输入是否有校验？

**VC2.0 专项：**
- [ ] Docker 改动是否正确（无新增 ports、无硬编码密码）？
- [ ] Python 代码是否清理了 `__pycache__`？
- [ ] Next.js 代码是否遵循 `params` 类型规范（不用 `use()`）？

### 3. 输出报告

```
## 代码质量审查报告

### 审查结论
✅ 通过 / ❌ 未通过

### 优点
-

### 问题（Critical / Important / Minor）
-

### 总体评价
-
```

## 通过标准

- 无 Critical 问题
- Important 问题 ≤ 2 个且 CC 已承诺修复计划
- Minor 问题可接受（记录在案）

## 审查失败处理

- Hermes 记录问题清单
- Hermes 将问题反馈给 CC（重新调度 CC 修复）
- CC 修复后重新走 spec-review → code-quality-review 流程
- **禁止跳过 spec-review**
