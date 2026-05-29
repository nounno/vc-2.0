'use client'
import Sidebar from '@vc2/ui/components/Sidebar'
import {
  LayoutDashboard, Package, Users, UserCheck, Grid3X3,
  BookOpen, AlertTriangle, FileText, BarChart3,
  TrendingUp, Zap, Download, Upload,
} from 'lucide-react'

const navItems = [
  { href: '/', label: '数据指挥台', icon: LayoutDashboard, section: '运营' },
  { href: '/quality', label: '质量审核', icon: AlertTriangle, section: '数据管理' },
  { href: '/rules', label: '规则学习', icon: TrendingUp },
  { href: '/export', label: '数据导出', icon: Download },
  { href: '/brands', label: '品牌管理', icon: BookOpen },
  { href: '/categories', label: '品类管理', icon: Grid3X3 },
  { href: '/columns', label: '字段管理', icon: FileText },
  { href: '/products', label: '商品管理', icon: Package },
  { href: '/accounts', label: '供应商账户', icon: UserCheck, section: '系统' },
  { href: '/logs', label: '操作日志', icon: BarChart3 },
  { href: '/pipeline', label: '数据管道', icon: Zap },
  { href: '/parser', label: '解析任务', icon: Upload },
  { href: '/suppliers', label: '供应商管理', icon: Users },
]

export default function AdminSidebar() {
  return (
    <Sidebar
      logoText="ValueCube"
      subtitle="管理控制台"
      navItems={navItems}
      showUser={true}
      versionText="ValueCube v2.0"
    />
  )
}
