'use client';

export default function WebPage() {
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
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-md flex items-center justify-center text-vt-fg font-bold text-lg"
              style={{ background: "#38bdf8" }}>
              V
            </div>
            <span className="font-bold text-lg tracking-tight text-vt-fg">ValueCube</span>
          </a>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8 ml-auto">
            <a href="#features" className="text-sm text-vt-muted hover:text-vt-fg transition-colors duration-90">产品功能</a>
            <a href="#modules" className="text-sm text-vt-muted hover:text-vt-fg transition-colors duration-90">核心模块</a>
            <a href="#contact" className="text-sm text-vt-muted hover:text-vt-fg transition-colors duration-90">联系我们</a>
          </div>

          {/* CTA */}
          <a href="#contact"
            className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-md text-vt-accent-on transition-all duration-90 ml-4"
            style={{ background: "#38bdf8" }}
            onMouseEnter={e => (e.currentTarget.style.background = "color-mix(in oklab, #38bdf8, black 8%)")}
            onMouseLeave={e => (e.currentTarget.style.background = "#38bdf8")}
          >
            预约演示
            <span>→</span>
          </a>
        </div>
      </nav>

      <main>
        {/* ─── Hero ─────────────────────────────────────────────── */}
        <section className="px-9 py-20">
          <div className="max-w-container mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">

              {/* Left: Copy */}
              <div className="space-y-5">
                <p className="font-mono text-xs font-bold tracking-widest uppercase"
                  style={{ color: "#38bdf8" }}>
                  Appliance B2B Data Infrastructure
                </p>
                <h1 className="font-bold leading-tight tracking-tight"
                  style={{ fontSize: "clamp(36px,5vw,56px)", letterSpacing: "-0.01em" }}>
                  家电流通<br />加速器
                </h1>
                <p className="text-vt-fg-2 text-base max-w-md leading-relaxed">
                  50<span style={{ color: "#38bdf8" }}>+</span>品牌实时报价{" "}
                  <span className="text-vt-muted mx-1">·</span>{" "}
                  AI智能解析{" "}
                  <span className="text-vt-muted mx-1">·</span>{" "}
                  全渠道供需匹配
                </p>
                <p className="text-vt-muted text-sm max-w-sm leading-relaxed">
                  让信息的流动速度超越货物的物理移动速度
                </p>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <a href="#contact"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold rounded-md text-vt-accent-on transition-all duration-90"
                    style={{ background: "#38bdf8" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "color-mix(in oklab, #38bdf8, black 8%)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "#38bdf8")}
                  >
                    预约演示
                    <span>→</span>
                  </a>
                  <a href="#features"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold rounded-md border transition-all duration-90"
                    style={{ background: "#101826", color: "#f8fafc", borderColor: "#263246" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#38bdf8"; e.currentTarget.style.color = "#38bdf8"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#263246"; e.currentTarget.style.color = "#f8fafc"; }}
                  >
                    了解更多
                  </a>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap gap-8 pt-6 border-t border-vt-border-soft">
                  {[
                    { val: "50+", label: "合作品牌" },
                    { val: "94%", label: "解析准确率" },
                    { val: "7×24", label: "全天候监控" },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <div className="font-bold leading-none"
                        style={{ fontSize: "28px", color: "#38bdf8" }}>{s.val}</div>
                      <div className="text-vt-muted text-xs mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Live Terminal Panel */}
              <article className="rounded-xl border overflow-hidden"
                style={{ background: "#101826", borderColor: "#263246", boxShadow: "0 24px 80px rgba(0,0,0,0.42)" }}>
                {/* Panel Header */}
                <div className="flex justify-between items-center px-5 py-4 border-b"
                  style={{ borderColor: "#1c2638" }}>
                  <div>
                    <p className="font-mono text-xs font-bold tracking-widest uppercase" style={{ color: "#38bdf8" }}>
                      Live Module
                    </p>
                    <h3 className="font-bold text-base mt-0.5">ValueCube Market Data</h3>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase" style={{ color: "#38bdf8" }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
                    online
                  </div>
                </div>

                {/* Metric Grid */}
                <div className="grid grid-cols-3 border-b" style={{ borderColor: "#1c2638" }}>
                  {[
                    { val: "50+", label: "Active brands" },
                    { val: "12,847", label: "SKUs tracked" },
                    { val: "94%", label: "Parse accuracy" },
                  ].map((m, i) => (
                    <div key={m.label} className="px-5 py-4 font-mono"
                      style={{ borderRight: i < 2 ? "1px solid #1c2638" : "none" }}>
                      <strong className="block font-bold leading-tight" style={{ fontSize: "22px" }}>{m.val}</strong>
                      <span className="text-vt-muted text-xs mt-0.5 block">{m.label}</span>
                    </div>
                  ))}
                </div>

                {/* Data rows */}
                <div className="px-5 py-4 space-y-3">
                  {[
                    { brand: "美的", category: "空调", updated: "刚刚", trend: "+2.1%" },
                    { brand: "海尔", category: "冰箱", updated: "10分钟前", trend: "-0.8%" },
                    { brand: "格力", category: "空调", updated: "30分钟前", trend: "+1.5%" },
                  ].map(row => (
                    <div key={row.brand} className="flex items-center justify-between px-4 py-2.5 rounded-md border"
                      style={{ background: "#162238", borderColor: "#1c2638" }}>
                      <div>
                        <span className="font-bold text-sm">{row.brand}</span>
                        <span className="text-vt-muted text-xs ml-2">{row.category}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-xs">
                        <span className="text-vt-muted">{row.updated}</span>
                        <span className="font-bold"
                          style={{ color: row.trend.startsWith("+") ? "#22c55e" : "#ef4444" }}>
                          {row.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ─── Brand Promise ─────────────────────────────────────── */}
        <section className="px-9 py-20 border-t" style={{ borderColor: "#1c2638", background: "#101826" }}>
          <div className="max-w-container mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-bold leading-tight"
                style={{ fontSize: "clamp(28px,4vw,40px)", letterSpacing: "-0.01em" }}>
                我们的承诺
              </h2>
              <p className="text-vt-muted text-sm mt-3">ValueCube 不参与交易，只赋能交易</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { eyebrow: "Inventory", title: "不持有库存", desc: "专注数据服务，不重资产运营" },
                { eyebrow: "Logistics", title: "不介入物流", desc: "集成京东/顺丰/德邦专业物流" },
                { eyebrow: "Pricing", title: "不参与定价", desc: "让市场定价，数据驱动决策" },
                { eyebrow: "Spread", title: "不收取差价", desc: "透明佣金，服务费模式" },
              ].map(item => (
                <div key={item.title}
                  className="rounded-lg p-5 border transition-colors duration-90"
                  style={{ background: "#162238", borderColor: "#1c2638" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#38bdf8")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#1c2638")}
                >
                  <p className="font-mono text-xs font-bold tracking-widest uppercase mb-2"
                    style={{ color: "#38bdf8" }}>{item.eyebrow}</p>
                  <h3 className="font-bold text-base mb-1.5">{item.title}</h3>
                  <p className="text-vt-muted text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Core Features ─────────────────────────────────────── */}
        <section id="features" className="px-9 py-20">
          <div className="max-w-container mx-auto">
            <div className="text-center mb-12">
              <p className="font-mono text-xs font-bold tracking-widest uppercase mb-3"
                style={{ color: "#38bdf8" }}>Core Functions</p>
              <h2 className="font-bold leading-tight"
                style={{ fontSize: "clamp(28px,4vw,40px)", letterSpacing: "-0.01em" }}>
                数据驱动的家电流通引擎
              </h2>
              <p className="text-vt-muted text-sm mt-3 max-w-md mx-auto">
                从报价解析到智能匹配，覆盖家电B2B全链路数据需求
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  eyebrow: "Data Infrastructure",
                  title: "标准化商品库",
                  desc: "统一家电型号格式，跨供应商可比价。AI自动归一化品牌/品类/型号，解决一物多码的行业痛点。",
                  tag: "核心底座",
                  color: "#38bdf8",
                },
                {
                  eyebrow: "Real-time Tracking",
                  title: "价格变动监测",
                  desc: "每日快照入库，自动标记价格浮动。支持设置价格警戒线，异常波动实时推送提醒。",
                  tag: "智能监控",
                  color: "#22c55e",
                },
                {
                  eyebrow: "Smart Matching",
                  title: "供需比价引擎",
                  desc: "多供应商同型号横向对比，历史价格走势可视化。智能推荐最优采购方案，降低采购成本。",
                  tag: "决策支持",
                  color: "#a78bfa",
                },
              ].map(card => (
                <div key={card.title}
                  className="rounded-xl p-6 border transition-all duration-90 group"
                  style={{ background: "#101826", borderColor: "#263246" }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = card.color;
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "#263246";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <p className="font-mono text-xs font-bold tracking-widest uppercase mb-3"
                    style={{ color: card.color }}>{card.eyebrow}</p>
                  <h3 className="font-bold text-lg mb-2.5">{card.title}</h3>
                  <p className="text-vt-muted text-sm leading-relaxed mb-5">{card.desc}</p>
                  <span className="text-xs font-bold" style={{ color: card.color }}>
                    {card.tag} →
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Lower Tiles ─────────────────────────────────────── */}
        <section id="modules" className="px-9 py-20 border-t" style={{ borderColor: "#1c2638" }}>
          <div className="max-w-container mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  eyebrow: "Data Ingestion",
                  title: "报价文件解析",
                  desc: "支持 RAR/XLSX/PDF 多格式，AI自动识别表头、解析列映射、提取商品规格与价格。",
                },
                {
                  eyebrow: "Quality Control",
                  title: "数据质量治理",
                  desc: "智能查重、格式标准化、异常值检测。逐行标注数据质量评分，确保进入商品库的数据准确可用。",
                },
                {
                  eyebrow: "API & Export",
                  title: "数据服务输出",
                  desc: "RESTful API 实时查询，Webhook 推送变更通知。结构化导出 Excel/JSON，支持 ERP 系统无缝集成。",
                },
              ].map(tile => (
                <div key={tile.title}
                  className="rounded-lg p-5 border"
                  style={{ background: "#101826", borderColor: "#263246" }}>
                  <p className="font-mono text-xs font-bold tracking-widest uppercase mb-2"
                    style={{ color: "#38bdf8" }}>{tile.eyebrow}</p>
                  <h3 className="font-bold text-base mb-2">{tile.title}</h3>
                  <p className="text-vt-muted text-xs leading-relaxed">{tile.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ─────────────────────────────────────────────── */}
        <section id="contact" className="px-9 py-20 border-t" style={{ borderColor: "#1c2638", background: "#101826" }}>
          <div className="max-w-container mx-auto text-center">
            <h2 className="font-bold leading-tight"
              style={{ fontSize: "clamp(28px,4vw,40px)", letterSpacing: "-0.01em" }}>
              准备好加速你的家电流通了吗？
            </h2>
            <p className="text-vt-muted text-sm mt-3 mb-8 max-w-sm mx-auto">
              预约演示，了解 ValueCube 如何为你的业务赋能
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a href="mailto:contact@valuecube.com"
                className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold rounded-md text-vt-accent-on transition-all duration-90"
                style={{ background: "#38bdf8" }}
                onMouseEnter={e => (e.currentTarget.style.background = "color-mix(in oklab, #38bdf8, black 8%)")}
                onMouseLeave={e => (e.currentTarget.style.background = "#38bdf8")}
              >
                预约演示
                <span>→</span>
              </a>
              <a href="mailto:contact@valuecube.com"
                className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold rounded-md border transition-all duration-90"
                style={{ background: "transparent", color: "#f8fafc", borderColor: "#263246" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#38bdf8"; e.currentTarget.style.color = "#38bdf8"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#263246"; e.currentTarget.style.color = "#f8fafc"; }}
              >
                联系我们
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ───────────────────────────────────────────── */}
      <footer className="px-9 py-8 border-t" style={{ borderColor: "#1c2638" }}>
        <div className="max-w-container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded flex items-center justify-center text-vt-accent-on font-bold text-sm"
              style={{ background: "#38bdf8" }}>V</div>
            <span className="font-bold text-sm text-vt-fg">ValueCube</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-vt-muted">
            <a href="#" className="hover:text-vt-fg transition-colors duration-90">隐私政策</a>
            <a href="#" className="hover:text-vt-fg transition-colors duration-90">服务条款</a>
            <a href="mailto:contact@valuecube.com" className="hover:text-vt-fg transition-colors duration-90">联系邮箱</a>
          </div>
          <div className="text-xs text-vt-muted" style={{ opacity: 0.5 }}>
            © 2026 ValueCube. 保留所有权利。
          </div>
        </div>
      </footer>
    </div>
  );
}
