# /deploy 部署检查与执行

## 用途
执行部署前的检查和部署操作。

## 执行步骤

### 1. 预检（必须先执行）
```bash
cd /home/ubuntu/vc-2.0
bash deploy-check.sh
```
- 检查所有服务状态
- 检查 Docker 镜像是否存在
- 检查数据库连接
- 检查端口占用

### 2. 确认检查结果
- 如有错误：报告错误，等待指令
- 如全部通过：报告检查结果，等待确认部署

### 3. 执行部署（二次确认后）
```bash
cd /home/ubuntu/vc-2.0
docker compose build
docker compose up -d
```

### 4. 验证服务
```bash
docker compose ps
curl -s http://localhost:8000/health
curl -s http://localhost:3001
```

### 5. 报告结果
```
## 部署报告

### 预检状态
- [✓/✗] 服务检查
- [✓/✗] 镜像检查
- [✓/✗] 数据库连接
- [✓/✗] 端口检查

### 部署结果
| 服务 | 状态 | 端口 |
|------|------|------|
| admin | running | 3001 |
| ...

### 域名状态
- admin.ibotclaw.com: [✓/✗]
- supplier.ibotclaw.com: [✓/✗]
- ...
```

## 注意事项

- **生产部署必须二次确认**
- 部署失败立即停止，报告错误
- 不自行补救，等待明确指令
- 成功部署后必须验证所有端点
