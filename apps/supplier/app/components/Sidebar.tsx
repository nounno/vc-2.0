'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Upload, History, AlertCircle, User, Zap, ChevronRight } from 'lucide-react'

const navItems = [
  { href: '/', label: '报价上传', icon: Upload },
  { href: '/history', label: '报价历史', icon: History },
  { href: '/feedback', label: '质量反馈', icon: AlertCircle },
  { href: '/profile', label: '供应商档案', icon: User },
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
            <div className="text-[#666] text-xs">供应商门户</div>
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
        <div className="text-xs text-[#666] mt-0.5">Supplier Portal</div>
      </div>
    </aside>
  )
}
