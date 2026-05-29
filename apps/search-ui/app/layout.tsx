import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ValueCube 搜索',
  description: '家电B2B数据搜索平台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[#070b12] text-[#f8fafc] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
