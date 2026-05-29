'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ChevronRight, LogOut, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  section?: string  // 可选，用于分组标题
}

interface SidebarProps {
  logoText?: string
  subtitle?: string
  navItems: NavItem[]
  showUser?: boolean
  footerNote?: string
  versionText?: string
}

export default function Sidebar({ logoText = 'ValueCube', subtitle = '', navItems, showUser = false, footerNote = '', versionText = 'ValueCube v2.0' }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [username, setUsername] = useState<string>('')

  useEffect(() => {
    if (!showUser) return
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/v1/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUsername(data.username || '')
        }
      } catch { /* ignore */ }
    }
    fetchUser()
  }, [showUser])

  const handleLogout = async () => {
    try { await fetch('/api/v1/auth/logout', { method: 'POST' }) }
    finally { router.push('/login') }
  }

  let lastSection = ''

  return (
    <aside className="w-[220px] min-h-screen bg-[#111111] border-r border-[#262626] flex flex-col">
      <div className="p-5 border-b border-[#262626]">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#3b82f6] rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">{logoText}</div>
            {subtitle && <div className="text-[#666] text-xs">{subtitle}</div>}
          </div>
        </Link>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item, idx) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'))
          const showSection = item.section && item.section !== lastSection
          if (item.section) lastSection = item.section
          return (
            <>
              {showSection && (
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-[#555] font-semibold mt-3 mb-1">
                  {item.section}
                </div>
              )}
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
            </>
          )
        })}
      </nav>

      <div className="p-4 border-t border-[#262626]">
        <div className="text-xs text-[#666]">{versionText}</div>
        {username && showUser && <div className="text-xs text-[#a1a1a1] mt-2 truncate">{username}</div>}
        {showUser && (
          <div className="flex gap-2 mt-2">
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f] transition-all">
              <LogOut className="w-3.5 h-3.5" />退出登录
            </button>
          </div>
        )}
        {footerNote && <div className="text-xs text-[#666] mt-3 pt-3 border-t border-[#1f1f1f]">{footerNote}</div>}
      </div>
    </aside>
  )
}
