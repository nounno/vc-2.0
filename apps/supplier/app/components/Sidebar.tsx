'use client'
import Sidebar from '@vc2/ui/components/Sidebar'
import { History, AlertCircle, User, Upload } from 'lucide-react'

const navItems = [
  { href: '/upload', label: '上传报价', icon: Upload },
  { href: '/profile', label: '供应商档案', icon: User },
  { href: '/history', label: '报价历史', icon: History },
  { href: '/feedback', label: '质量反馈', icon: AlertCircle },
]

export default function SupplierSidebar() {
  return (
    <Sidebar
      logoText="ValueCube"
      subtitle="供应商门户"
      navItems={navItems}
      showUser={false}
      versionText="ValueCube v2.0"
      footerNote="供应商账户由 ValueCube 管理，无需退出或切换"
    />
  )
}
