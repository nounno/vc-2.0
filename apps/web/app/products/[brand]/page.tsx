'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

const BRAND_DATA: Record<string, {
  tier: string;
  categories: string[];
  description: string;
  products: Array<{ model: string; category: string; price: string; change: string }>;
}> = {
  "美的": {
    tier: "一线",
    categories: ["空调", "冰箱", "洗衣机", "厨房电器"],
    description: "美的集团是一家集消费电器、暖通空调、机器人与自动化系统、智能供应链（物流）于一体的科技集团。",
    products: [
      { model: "KFR-35GW/BP3DN8Y", category: "空调", price: "¥2,899", change: "+1.2%" },
      { model: "BCD-520WGPZM", category: "冰箱", price: "¥6,599", change: "-0.5%" },
      { model: "MG100V70", category: "洗衣机", price: "¥3,299", change: "+0.8%" },
    ]
  },
  "海尔": {
    tier: "一线",
    categories: ["冰箱", "洗衣机", "空调", "热水器"],
    description: "海尔集团是全球领先的美好生活解决方案服务商，产品涵盖家电、通讯、IT数码等多个领域。",
    products: [
      { model: "BCD-520WDPD", category: "冰箱", price: "¥5,999", change: "+2.1%" },
      { model: "EG10014B49GU1", category: "洗衣机", price: "¥4,299", change: "+0.3%" },
      { model: "KFR-50LW/08", category: "空调", price: "¥4,899", change: "-1.2%" },
    ]
  },
  "格力": {
    tier: "一线",
    categories: ["空调"],
    description: "珠海格力电器股份有限公司是一家集研发、生产、销售、服务于一体的国际化家电企业。",
    products: [
      { model: "KFR-35GW/NhAa1BA", category: "空调", price: "¥3,299", change: "+0.9%" },
      { model: "KFR-50LW/NhAa1BA", category: "空调", price: "¥5,499", change: "+1.5%" },
      { model: "KFR-72LW/NhAa1BA", category: "空调", price: "¥7,299", change: "-0.6%" },
    ]
  },
};

const TIER_COLORS: Record<string, string> = {
  "一线": "#22c55e",
  "二线": "#38bdf8",
  "高端": "#a78bfa",
};

export default function BrandPage() {
  const params = useParams();
  const brand = params.brand as string;
  const brandData = BRAND_DATA[brand] || {
    tier: "一线",
    categories: ["家电"],
    description: `${brand}是一家知名的家电品牌，产品质量优良，市场占有率高。`,
    products: [
      { model: `${brand}-ABC123`, category: "家电", price: "¥3,999", change: "+0.0%" },
    ]
  };

  return (
    <div className="min-h-screen text-vt-fg font-sans"
      style={{
        background: "radial-gradient(circle at 78% 10%, rgba(56, 189, 248, 0.12), transparent 34%), #070b12",
      }}
    >
      {/* ─── Navigation ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 h-14 flex items-center border-b border-vt-border"
        style={{ background: "rgba(7, 11, 18, 0.88)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-container mx-auto w-full px-9 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-md flex items-center justify-center text-vt-fg font-bold text-lg"
              style={{ background: "#38bdf8" }}>
              V
            </div>
            <span className="font-bold text-lg tracking-tight text-vt-fg">ValueCube</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 ml-auto">
            <Link href="/products" className="text-sm text-vt-muted hover:text-vt-fg transition-colors duration-90">产品中心</Link>
            <a href="/#features" className="text-sm text-vt-muted hover:text-vt-fg transition-colors duration-90">产品功能</a>
            <a href="/#contact" className="text-sm text-vt-muted hover:text-vt-fg transition-colors duration-90">联系我们</a>
          </div>
        </div>
      </nav>

      {/* ─── Brand Header ─────────────────────────────────────────── */}
      <section className="px-9 py-12 border-b" style={{ borderColor: "#1c2638", background: "#101826" }}>
        <div className="max-w-container mx-auto">
          <Link href="/products" className="inline-flex items-center gap-2 text-sm mb-6 transition-colors"
            style={{ color: "#38bdf8" }}>
            ← 返回产品中心
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-20 h-20 rounded-xl flex items-center justify-center font-bold text-3xl"
              style={{ background: TIER_COLORS[brandData.tier], color: "#03111a" }}>
              {brand[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-bold text-3xl">{brand}</h1>
                <span className="text-sm font-mono px-3 py-1 rounded-full"
                  style={{ background: `${TIER_COLORS[brandData.tier]}20`, color: TIER_COLORS[brandData.tier] }}>
                  {brandData.tier}品牌
                </span>
              </div>
              <p className="text-vt-muted text-sm max-w-2xl mb-3">{brandData.description}</p>
              <div className="flex flex-wrap gap-2">
                {brandData.categories.map(cat => (
                  <Link key={cat} href={`/products?category=${encodeURIComponent(cat)}`}
                    className="text-xs px-3 py-1 rounded-full border transition-colors"
                    style={{ borderColor: "#263246", color: "#8492a6" }}
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="font-bold text-xl" style={{ color: "#38bdf8" }}>171+</div>
                <div className="text-vt-muted text-xs">覆盖品牌</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Products ─────────────────────────────────────────── */}
      <section className="px-9 py-10">
        <div className="max-w-container mx-auto">
          <h2 className="font-bold text-lg mb-6">实时价格数据</h2>
          
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#263246" }}>
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_120px_120px_100px] gap-4 px-5 py-3 border-b font-mono text-xs font-bold uppercase"
              style={{ borderColor: "#1c2638", color: "#8492a6", background: "#101826" }}>
              <div>型号</div>
              <div className="text-center">品类</div>
              <div className="text-right">价格</div>
              <div className="text-right">涨跌</div>
            </div>
            
            {/* Table Rows */}
            {brandData.products.map((product, i) => (
              <div key={product.model}
                className="grid grid-cols-[1fr_120px_120px_100px] gap-4 px-5 py-4 border-b items-center"
                style={{ borderColor: "#1c2638", background: i % 2 === 0 ? "#162238" : "#101826" }}
              >
                <div className="font-mono text-sm">{product.model}</div>
                <div className="text-center text-sm text-vt-muted">{product.category}</div>
                <div className="text-right font-bold">{product.price}</div>
                <div className="text-right font-mono text-sm"
                  style={{ color: product.change.startsWith("+") ? "#22c55e" : "#ef4444" }}>
                  {product.change}
                </div>
              </div>
            ))}
          </div>

          {/* Additional Info */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg p-5 border" style={{ background: "#101826", borderColor: "#263246" }}>
              <h3 className="font-bold text-sm mb-2" style={{ color: "#38bdf8" }}>数据来源</h3>
              <p className="text-vt-muted text-xs">实时抓取品牌官方报价文件，每日更新</p>
            </div>
            <div className="rounded-lg p-5 border" style={{ background: "#101826", borderColor: "#263246" }}>
              <h3 className="font-bold text-sm mb-2" style={{ color: "#22c55e" }}>解析准确率</h3>
              <p className="text-vt-muted text-xs">AI模型自动解析，准确率达94%以上</p>
            </div>
            <div className="rounded-lg p-5 border" style={{ background: "#101826", borderColor: "#263246" }}>
              <h3 className="font-bold text-sm mb-2" style={{ color: "#a78bfa" }}>价格监控</h3>
              <p className="text-vt-muted text-xs">7×24小时监控，异常波动实时推送</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────── */}
      <footer className="px-9 py-8 border-t mt-8" style={{ borderColor: "#1c2638" }}>
        <div className="max-w-container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded flex items-center justify-center text-vt-accent-on font-bold text-sm"
              style={{ background: "#38bdf8" }}>V</div>
            <span className="font-bold text-sm text-vt-fg">ValueCube</span>
          </div>
          <div className="text-xs text-vt-muted" style={{ opacity: 0.5 }}>
            © 2026 ValueCube. 保留所有权利。
          </div>
        </div>
      </footer>
    </div>
  );
}
