'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Package,
  Users,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Settings,
  TrendingUp,
  FileText,
  Zap,
  ChevronRight,
  LogOut,
  ArrowRight,
  Upload,
} from 'lucide-react'

const navItems = [
  { href: '/', label: '今日概览', icon: LayoutDashboard },
  { href: '/quality', label: '质量审核', icon: AlertTriangle },
  { href: '/rules', label: '规则学习', icon: TrendingUp },
  { href: '/brands', label: '品牌管理', icon: BookOpen },
  { href: '/categories', label: '品类管理', icon: Package },
  { href: '/columns', label: '字段管理', icon: FileText },
  { href: '/products', label: '商品管理', icon: Package },
  { href: '/accounts', label: '供应商账户', icon: Users },
  { href: '/logs', label: '操作日志', icon: BarChart3 },
  { href: '/upload', label: '数据上传', icon: Upload },
  { href: '/pipeline', label: '数据管道', icon: Zap },
  { href: '/suppliers', label: '供应商管理', icon: Users },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [username, setUsername] = useState<string>('')

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/v1/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUsername(data.username || '')
        }
      } catch {
        // ignore
      }
    }
    fetchUser()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' })
    } finally {
      router.push('/login')
    }
  }

  const handleSwitchAccount = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' })
    } finally {
      router.push('/login')
    }
  }

  return (
    <aside className="w-[220px] min-h-screen bg-[#111111] border-r border-[#262626] flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-[#262626]">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#3b82f6] rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">ValueCube</div>
            <div className="text-[#666] text-xs">管理控制台</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30'
                  : 'text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f]'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#262626]">
        <div className="text-xs text-[#666]">价值魔方 v2.0</div>
        <div className="text-xs text-[#666] mt-0.5">架构阶段 4.5</div>
        {username && (
          <div className="text-xs text-[#a1a1a1] mt-2 truncate">{username}</div>
        )}
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f] transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            退出登录
          </button>
          <button
            onClick={handleSwitchAccount}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f] transition-all"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            切换账号
          </button>
        </div>
      </div>
    </aside>
  )
}
