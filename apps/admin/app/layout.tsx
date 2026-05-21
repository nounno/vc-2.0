import type { Metadata } from 'next'
import './globals.css'
import PageContainer from './components/PageContainer'

export const metadata: Metadata = {
  title: 'ValueCube Admin',
  description: 'ValueCube 数据管理后台',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <PageContainer>{children}</PageContainer>
      </body>
    </html>
  )
}
