'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  { href: '/pipeline', label: '数据管道', icon: Zap },
  { href: '/suppliers', label: '供应商管理', icon: Users },
]

export default function Sidebar() {
  const pathname = usePathname()

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
            <div className="text-[#666] text-xs">Admin Console</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
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
        <div className="text-xs text-[#666]">ValueCube v2.0</div>
        <div className="text-xs text-[#666] mt-0.5">Constitution Phase 4.5</div>
      </div>
    </aside>
  )
}
