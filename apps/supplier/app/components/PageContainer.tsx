'use client'
import SupplierSidebar from './Sidebar'
import { ReactNode } from 'react'

export default function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <SupplierSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
