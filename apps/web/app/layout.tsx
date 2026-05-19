import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ValueCube - 家电流通加速器",
  description: "家电行业B2B数据基础设施。50+品牌实时报价 · AI智能解析 · 全渠道供需匹配",
  keywords: "家电, B2B, 数据, 价格, 报价, 采购, 供应链",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
