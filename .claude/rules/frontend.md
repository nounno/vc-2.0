# VC 2.0 前端规范 v3.0

> 生效日期：2026-05-28
> 版本：v3.0
> 覆盖领域：认证、API、组件、Middleware、路由、错误处理

---

## 1. 认证（Authentication）

### 1.1 JWT + httpOnly Cookie
- 登录成功返回 JWT Token，同时设置 `httpOnly` Cookie
- Cookie 名称：`access_token`（主 Token）、`vc_session`（会话 ID）
- Header 兼容：`Authorization: Bearer <token>` 同样接受
- Token 有效期：24小时
- 禁止在 localStorage/sessionStorage 存储 Token

### 1.2 前端认证流程
```typescript
// 登录
const login = async (username: string, password: string) => {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    credentials: 'include',  // 发送 httpOnly Cookie
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new AuthError('登录失败');
  return res.json();
};

// 获取当前用户
const getMe = async () => {
  const res = await fetch('/api/v1/auth/me', {
    credentials: 'include'
  });
  if (res.status === 401) redirect('/login');
  return res.json();
};
```

### 1.3 认证检查点
- [ ] 登录页无 Token 时才能访问，已登录自动跳转 `/dashboard`
- [ ] 登出清除 Cookie + 跳转登录页
- [ ] API 401 响应自动触发登出流程

---

## 2. API 层

### 2.1 API 客户端封装
```typescript
// apps/web/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(res.status, error.detail);
  }

  return res.json();
}

// 封装常用方法
export const api = {
  get: <T>(url: string) => apiRequest<T>(url),
  post: <T>(url: string, data: unknown) =>
    apiRequest<T>(url, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(url: string, data: unknown) =>
    apiRequest<T>(url, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(url: string) => apiRequest<T>(url, { method: 'DELETE' })
};
```

### 2.2 API 错误处理
```typescript
// 统一错误类型
class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 错误映射
const errorMessages: Record<number, string> = {
  400: '请求参数错误',
  401: '登录已过期，请重新登录',
  403: '无权限访问',
  404: '资源不存在',
  500: '服务器内部错误'
};
```

### 2.3 API 检查点
- [ ] 所有 API 调用使用统一封装，禁止直接 fetch
- [ ] 环境变量 `NEXT_PUBLIC_API_URL` 配置 API 基础路径
- [ ] 错误响应统一格式：`{ detail: string, code?: string }`

---

## 3. 组件规范

### 3.1 Tailwind + lucide-react
- UI 框架：Tailwind CSS（不封装组件库，按需使用原子类）
- 图标库：lucide-react（统一图标组件）
- 不使用 Shadcn UI，保持轻量

### 3.2 组件示例
```typescript
// 按钮组件
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  loading,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    ghost: 'bg-transparent hover:bg-gray-100'
  };

  return (
    <button
      className={`px-4 py-2 rounded-lg font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  );
}
```

### 3.3 组件检查点
- [ ] 按钮/输入框/卡片等基础组件使用 Tailwind 原子类
- [ ] 图标统一使用 lucide-react
- [ ] 组件命名：PascalCase，如 `DataTable.tsx`、`UserAvatar.tsx`

---

## 4. Middleware（中间件）

### 4.1 Next.js Middleware 认证守卫
```typescript
// middleware.ts（位于 apps/web/ 或 apps/admin/ 根目录）
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路径
  const publicPaths = ['/login', '/register', '/api/v1/auth/login'];
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 检查认证
  const token = request.cookies.get('access_token');
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
```

### 4.2 Middleware 检查点
- [ ] 未登录请求重定向到 `/login`
- [ ] 登录页本身可访问（避免死循环）
- [ ] 静态资源（`/_next/`、`/favicon.ico`）跳过检查

---

## 5. 路由（Routing）

### 5.1 Next.js App Router 结构
```
apps/
├── admin/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx      # 仪表盘布局（含侧边栏）
│   │   │   ├── page.tsx        # 首页仪表盘
│   │   │   ├── suppliers/
│   │   │   └── products/
│   │   └── api/                # API 代理（如需要）
│   └── middleware.ts
```

### 5.2 路由约定
- 路由组 `(auth)` 不影响 URL，用于分组布局
- 布局组件（layout.tsx）处理通用 Shell（侧边栏、Header）
- 页面组件（page.tsx）处理具体业务

### 5.3 路由检查点
- [ ] 登录页：`/(auth)/login/page.tsx`
- [ ] 受保护页面包装在 `(dashboard)` 路由组
- [ ] API 路由在 `app/api/` 下，使用 Next.js Route Handlers

---

## 6. 错误处理

### 6.1 全局错误边界
```typescript
// components/ErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            页面加载失败
          </h1>
          <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
          <Button onClick={() => window.location.reload()}>
            刷新页面
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### 6.2 表单错误处理
```typescript
// 使用 react-hook-form + Zod
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  username: z.string().min(2, '用户名至少2个字符'),
  password: z.string().min(6, '密码至少6个字符')
});

export function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('username')} />
      {errors.username && (
        <p className="text-red-500 text-sm">{errors.username.message}</p>
      )}
      {/* ... */}
    </form>
  );
}
```

### 6.3 错误处理检查点
- [ ] 全局 ErrorBoundary 包裹 App
- [ ] 表单验证使用 Zod schema
- [ ] API 错误转换为用户友好提示
- [ ] 错误日志上报（如 Sentry）

---

## 附录：技术栈对照表

| 规范项 | v2（废弃） | v3（现行） |
|--------|-----------|-----------|
| 后端框架 | TypeScript Next.js API Routes | Python FastAPI |
| UI 组件库 | Shadcn UI | Tailwind + lucide-react |
| 图标方案 | @radix-ui/icons | lucide-react |
| 状态管理 | Context/Redux | React Query + Zustand（按需） |
