'use client';

import { useState } from 'react';
import Link from 'next/link';

const CATEGORIES = [
  { name: "空调", en: "Air Conditioners", count: 32, icon: "❄️" },
  { name: "冰箱", en: "Refrigerators", count: 28, icon: "🧊" },
  { name: "洗衣机", en: "Washers", count: 24, icon: "👕" },
  { name: "电视", en: "TVs", count: 31, icon: "📺" },
  { name: "厨房电器", en: "Kitchen Appliances", count: 45, icon: "🍳" },
  { name: "热水器", en: "Water Heaters", count: 19, icon: "🚿" },
  { name: "小家电", en: "Small Appliances", count: 52, icon: "🔌" },
  { name: "冷柜", en: "Freezers", count: 15, icon: "🗄️" },
];

const BRANDS = [
  { name: "美的", tier: "一线", categories: ["空调", "冰箱", "洗衣机", "厨房电器"] },
  { name: "海尔", tier: "一线", categories: ["冰箱", "洗衣机", "空调", "热水器"] },
  { name: "格力", tier: "一线", categories: ["空调"] },
  { name: "海信", tier: "一线", categories: ["电视", "空调", "冰箱"] },
  { name: "TCL", tier: "一线", categories: ["电视", "空调"] },
  { name: "长虹", tier: "一线", categories: ["电视", "空调"] },
  { name: "奥克斯", tier: "二线", categories: ["空调"] },
  { name: "松下", tier: "一线", categories: ["空调", "冰箱", "洗衣机"] },
  { name: "三菱电机", tier: "高端", categories: ["空调"] },
  { name: "大金", tier: "高端", categories: ["空调"] },
  { name: "卡萨帝", tier: "高端", categories: ["冰箱", "洗衣机", "空调"] },
  { name: "COLMO", tier: "高端", categories: ["冰箱", "洗衣机", "厨房电器"] },
  { name: "小天鹅", tier: "一线", categories: ["洗衣机"] },
  { name: "博世", tier: "高端", categories: ["冰箱", "洗衣机", "厨房电器"] },
  { name: "西门子", tier: "高端", categories: ["冰箱", "洗衣机", "厨房电器"] },
  { name: "三星", tier: "一线", categories: ["电视", "冰箱", "洗衣机"] },
  { name: "LG", tier: "一线", categories: ["电视", "冰箱", "洗衣机"] },
  { name: "索尼", tier: "一线", categories: ["电视"] },
];

const TIER_COLORS: Record<string, string> = {
  "一线": "#22c55e",
  "二线": "#38bdf8",
  "高端": "#a78bfa",
};

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBrands = BRANDS.filter(brand => {
    const matchCategory = !selectedCategory || brand.categories.includes(selectedCategory);
    const matchTier = !selectedTier || brand.tier === selectedTier;
    const matchSearch = !searchQuery || brand.name.includes(searchQuery);
    return matchCategory && matchTier && matchSearch;
  });

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
            <Link href="/products" className="text-sm font-bold transition-colors duration-90" style={{ color: "#38bdf8" }}>产品中心</Link>
            <a href="/#features" className="text-sm text-vt-muted hover:text-vt-fg transition-colors duration-90">产品功能</a>
            <a href="/#contact" className="text-sm text-vt-muted hover:text-vt-fg transition-colors duration-90">联系我们</a>
          </div>
        </div>
      </nav>

      {/* ─── Hero Banner ─────────────────────────────────────────── */}
      <section className="px-9 py-16 border-b" style={{ borderColor: "#1c2638", background: "#101826" }}>
        <div className="max-w-container mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="font-mono text-xs font-bold tracking-widest uppercase mb-3"
                style={{ color: "#38bdf8" }}>
                Product Catalog
              </p>
              <h1 className="font-bold leading-tight"
                style={{ fontSize: "clamp(28px,4vw,44px)", letterSpacing: "-0.01em" }}>
                产品中心
              </h1>
              <p className="text-vt-muted text-sm mt-3 max-w-lg">
                覆盖 <span className="font-bold" style={{ color: "#38bdf8" }}>171 个品牌</span>，8大品类，
                超过 12,000+ SKU 实时价格数据
              </p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-lg px-4 py-2 border text-center"
                style={{ background: "#162238", borderColor: "#263246" }}>
                <div className="font-bold text-lg" style={{ color: "#38bdf8" }}>171+</div>
                <div className="text-vt-muted text-xs">品牌</div>
              </div>
              <div className="rounded-lg px-4 py-2 border text-center"
                style={{ background: "#162238", borderColor: "#263246" }}>
                <div className="font-bold text-lg" style={{ color: "#22c55e" }}>8</div>
                <div className="text-vt-muted text-xs">品类</div>
              </div>
              <div className="rounded-lg px-4 py-2 border text-center"
                style={{ background: "#162238", borderColor: "#263246" }}>
                <div className="font-bold text-lg" style={{ color: "#a78bfa" }}>12K+</div>
                <div className="text-vt-muted text-xs">SKU</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <section className="px-9 py-10">
        <div className="max-w-container mx-auto">

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="搜索品牌..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-10 rounded-lg border text-sm text-vt-fg placeholder-vt-muted focus:outline-none focus:border-vt-accent transition-colors"
                style={{ background: "#101826", borderColor: "#263246" }}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-vt-muted">🔍</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">

            {/* ─── Sidebar Filters ─────────────────────────────────── */}
            <aside className="space-y-6">

              {/* Categories */}
              <div>
                <h3 className="font-bold text-sm mb-3" style={{ color: "#38bdf8" }}>品类</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="w-full text-left px-3 py-2 rounded text-sm transition-colors"
                    style={{
                      background: !selectedCategory ? "#162238" : "transparent",
                      color: !selectedCategory ? "#f8fafc" : "#8492a6",
                      border: !selectedCategory ? "1px solid #263246" : "1px solid transparent"
                    }}
                  >
                    全部品类
                  </button>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.name}
                      onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                      className="w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between"
                      style={{
                        background: selectedCategory === cat.name ? "#162238" : "transparent",
                        color: selectedCategory === cat.name ? "#f8fafc" : "#8492a6",
                        border: selectedCategory === cat.name ? "1px solid #263246" : "1px solid transparent"
                      }}
                    >
                      <span>{cat.icon} {cat.name}</span>
                      <span className="font-mono text-xs" style={{ opacity: 0.6 }}>{cat.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tier Filter */}
              <div>
                <h3 className="font-bold text-sm mb-3" style={{ color: "#38bdf8" }}>品牌级别</h3>
                <div className="space-y-1">
                  {["全部", "一线", "二线", "高端"].map(tier => (
                    <button
                      key={tier}
                      onClick={() => setSelectedTier(tier === "全部" ? null : tier)}
                      className="w-full text-left px-3 py-2 rounded text-sm transition-colors"
                      style={{
                        background: (!tier || tier === "全部") && !selectedTier ? "#162238" : "transparent",
                        color: (!tier || tier === "全部") && !selectedTier ? "#f8fafc" : "#8492a6",
                        border: (!tier || tier === "全部") && !selectedTier ? "1px solid #263246" : "1px solid transparent"
                      }}
                    >
                      {tier === "全部" ? "全部级别" : tier}
                    </button>
                  ))}
                </div>
              </div>

              {/* Back to Home */}
              <div className="pt-4 border-t" style={{ borderColor: "#1c2638" }}>
                <Link href="/"
                  className="inline-flex items-center gap-2 text-sm transition-colors"
                  style={{ color: "#38bdf8" }}
                >
                  ← 返回首页
                </Link>
              </div>
            </aside>

            {/* ─── Brand Grid ─────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg">
                  {selectedCategory ? `${selectedCategory}品类品牌` : '全部品牌'}
                </h2>
                <span className="text-vt-muted text-sm font-mono">
                  {filteredBrands.length} 个品牌
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredBrands.map(brand => (
                  <Link
                    key={brand.name}
                    href={`/products/${brand.name}`}
                    className="rounded-xl p-5 border transition-all duration-90 group"
                    style={{ background: "#101826", borderColor: "#263246" }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = TIER_COLORS[brand.tier];
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "#263246";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg"
                        style={{ background: TIER_COLORS[brand.tier], color: "#03111a" }}>
                        {brand.name[0]}
                      </div>
                      <span className="text-xs font-mono px-2 py-0.5 rounded"
                        style={{ background: `${TIER_COLORS[brand.tier]}20`, color: TIER_COLORS[brand.tier] }}>
                        {brand.tier}
                      </span>
                    </div>
                    <h3 className="font-bold text-base mb-1">{brand.name}</h3>
                    <p className="text-vt-muted text-xs">
                      {brand.categories.slice(0, 2).join(", ")}
                      {brand.categories.length > 2 ? ` +${brand.categories.length - 2}` : ''}
                    </p>
                  </Link>
                ))}
              </div>

              {filteredBrands.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-vt-muted text-lg mb-2">未找到匹配的品牌</p>
                  <p className="text-vt-muted text-sm">尝试调整筛选条件</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────── */}
      <footer className="px-9 py-8 border-t mt-12" style={{ borderColor: "#1c2638" }}>
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
