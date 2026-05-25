#!/bin/bash
# 容器健康检查
# 全部 healthy → 静默退出 0
# 有异常 → echo 容器名 + 状态，退出非 0

unhealthy=$(docker ps --filter "health=unhealthy" --format "{{.Names}} {{.Status}}" | grep -v "^$")
exited=$(docker ps -a --filter "status=exited" --format "{{.Names}} {{.Status}}" | grep -v "^$")

if [ -n "$unhealthy" ]; then
    echo "UNHEALTHY: $unhealthy"
fi

if [ -n "$exited" ]; then
    echo "EXITED: $exited"
fi

if [ -n "$unhealthy" ] || [ -n "$exited" ]; then
    exit 1
fi

exit 0
