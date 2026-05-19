'use client'

// Types
interface BrandDistribution {
  brand: string
  count: number
  percentage: number
  avgQuality: number
  color: string
}

interface PricePositioning {
  category: string
  lowPrice: number
  highPrice: number
  marketAvg: number
  diff: number
  position: 'LOW' | 'MID' | 'HIGH'
}

interface TimelineEvent {
  date: string
  event: string
  description: string
  type: 'success' | 'warning' | 'info' | 'neutral'
}

interface Supplier {
  id: string
  maskedName: string
  healthScore: number
  grade: string
  cooperationSince: string
  totalQuotes: number
  activeCategories: string[]
  brandDistribution: BrandDistribution[]
  pricePositioning: PricePositioning[]
  timeline: TimelineEvent[]
}

// Mock data
const mockSupplier: Supplier = {
  id: '1',
  maskedName: '海*电器',
  healthScore: 87.5,
  grade: 'B',
  cooperationSince: '2024-03',
  totalQuotes: 1234,
  activeCategories: ['空调', '冰箱', '洗衣机'],
  brandDistribution: [
    { brand: '格力', count: 450, percentage: 36.5, avgQuality: 92.3, color: 'bg-blue-500' },
    { brand: '美的', count: 380, percentage: 30.8, avgQuality: 88.1, color: 'bg-green-500' },
    { brand: '海尔', count: 220, percentage: 17.8, avgQuality: 85.0, color: 'bg-orange-500' },
    { brand: '海信', count: 130, percentage: 10.5, avgQuality: 79.2, color: 'bg-purple-500' },
    { brand: '其他', count: 54, percentage: 4.4, avgQuality: 72.0, color: 'bg-gray-500' },
  ],
  pricePositioning: [
    { category: '空调', lowPrice: 2100, highPrice: 3800, marketAvg: 3200, diff: -12.5, position: 'LOW' },
    { category: '冰箱', lowPrice: 2800, highPrice: 5500, marketAvg: 4800, diff: 14.6, position: 'HIGH' },
    { category: '洗衣机', lowPrice: 1500, highPrice: 2800, marketAvg: 2100, diff: 33.0, position: 'HIGH' },
    { category: '电视', lowPrice: 3200, highPrice: 6800, marketAvg: 5500, diff: 23.6, position: 'HIGH' },
  ],
  timeline: [
    { date: '2026-05-15', event: '上传报价表', description: '解析成功率 92%', type: 'success' },
    { date: '2026-05-14', event: '数据质量下滑', description: '质量分从91降至78', type: 'warning' },
    { date: '2026-05-10', event: '规则学习', description: '新增型号前缀KFR→空调规则', type: 'info' },
    { date: '2026-05-01', event: '首次合作', description: '导入历史数据 234 条', type: 'neutral' },
  ],
}

// Brand color mapping for pie chart
const brandColors: Record<string, string> = {
  '格力': '#3b82f6',
  '美的': '#22c55e',
  '海尔': '#f97316',
  '海信': '#a855f7',
  '其他': '#6b7280',
}

// Tab configuration
const tabs = ['品牌分布', '价格带定位', '历史时间线'] as const
type TabType = typeof tabs[number]

// Circular Progress Component
function CircularProgress({ score }: { score: number }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference
  const rotation = -90

  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#262626"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transformOrigin: '50% 50%',
            rotate: `${rotation}deg`,
            transition: 'stroke-dashoffset 0.5s ease-out',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-white">{score}</span>
      </div>
    </div>
  )
}

// Grade Badge Component
function GradeBadge({ grade }: { grade: string }) {
  const gradeColors: Record<string, string> = {
    'A': 'bg-green-500/20 text-green-400 border-green-500/50',
    'B': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    'C': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    'D': 'bg-red-500/20 text-red-400 border-red-500/50',
  }

  return (
    <span className={`px-2 py-0.5 text-sm font-medium border rounded ${gradeColors[grade] || gradeColors['B']}`}>
      {grade}
    </span>
  )
}

// Position Badge Component
function PositionBadge({ position }: { position: 'LOW' | 'MID' | 'HIGH' }) {
  const positionConfig: Record<string, { bg: string; text: string; label: string }> = {
    LOW: { bg: 'bg-green-500/20', text: 'text-green-400', label: '偏低' },
    MID: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '适中' },
    HIGH: { bg: 'bg-red-500/20', text: 'text-red-400', label: '偏高' },
  }

  const config = positionConfig[position]

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

// Timeline Dot Component
function TimelineDot({ type }: { type: TimelineEvent['type'] }) {
  const dotColors: Record<TimelineEvent['type'], string> = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
    neutral: 'bg-gray-500',
  }

  return (
    <div className="relative flex flex-col items-center">
      <div className={`w-3 h-3 rounded-full ${dotColors[type]} ring-4 ring-[#0a0a0a]`} />
    </div>
  )
}

// Main Page Component
export default function SupplierProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const supplier = mockSupplier // In production, fetch based on id

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="flex">
        {/* Left Sidebar - Supplier Info Card */}
        <aside className="w-80 min-h-screen border-r border-[#1a1a1a] p-6 flex-shrink-0">
          <div className="bg-[#111111] rounded-xl p-6 border border-[#262626]">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-200 mb-1">健康档案</h2>
              <p className="text-sm text-gray-500">供应商智能分析</p>
            </div>

            {/* Supplier Name */}
            <div className="mb-6">
              <p className="text-xs text-gray-500 mb-1">供应商名称</p>
              <p className="text-xl font-medium text-white">{supplier.maskedName}</p>
            </div>

            {/* Health Score with Circular Progress */}
            <div className="flex flex-col items-center mb-6">
              <CircularProgress score={supplier.healthScore} />
              <p className="text-sm text-gray-400 mt-2">健康分</p>
            </div>

            {/* Info Grid */}
            <div className="space-y-4">
              {/* Grade */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">等级</span>
                <GradeBadge grade={supplier.grade} />
              </div>

              {/* Cooperation Since */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">合作时间</span>
                <span className="text-sm text-gray-300">{supplier.cooperationSince}</span>
              </div>

              {/* Total Quotes */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">累计报价</span>
                <span className="text-sm text-gray-300">{supplier.totalQuotes.toLocaleString()}条</span>
              </div>

              {/* Active Categories */}
              <div>
                <span className="text-sm text-gray-500 block mb-2">活跃品类</span>
                <div className="flex flex-wrap gap-2">
                  {supplier.activeCategories.map((category) => (
                    <span
                      key={category}
                      className="px-2 py-1 text-xs bg-[#1a1a1a] text-gray-300 rounded border border-[#262626]"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Main Content - Tabbed */}
        <main className="flex-1 p-6">
          {/* Tab Header */}
          <div className="flex gap-1 mb-6 border-b border-[#1a1a1a]">
            {tabs.map((tab) => (
              <button
                key={tab}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors relative group"
              >
                {tab}
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {/* Tab 1: Brand Distribution */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">品牌分布</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="bg-[#111111] rounded-xl p-6 border border-[#262626]">
                  <h4 className="text-sm font-medium text-gray-400 mb-4">报价品牌占比</h4>
                  <div className="flex items-center justify-center">
                    {/* CSS Pie Chart using conic-gradient */}
                    <div
                      className="w-48 h-48 rounded-full"
                      style={{
                        background: `conic-gradient(
                          ${supplier.brandDistribution.map((b, i) => {
                            const prevPercentage = supplier.brandDistribution.slice(0, i).reduce((sum, br) => sum + br.percentage, 0)
                            return `${brandColors[b.brand]} ${prevPercentage}% ${prevPercentage + b.percentage}%`
                          }).join(', ')}
                        )`,
                      }}
                    />
                  </div>
                  {/* Legend */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {supplier.brandDistribution.map((brand) => (
                      <div key={brand.brand} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: brandColors[brand.brand] }}
                        />
                        <span className="text-xs text-gray-400">{brand.brand}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Brand Table */}
                <div className="bg-[#111111] rounded-xl p-6 border border-[#262626]">
                  <h4 className="text-sm font-medium text-gray-400 mb-4">品牌明细</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#262626]">
                          <th className="text-left text-xs font-medium text-gray-500 pb-3">品牌</th>
                          <th className="text-right text-xs font-medium text-gray-500 pb-3">报价数</th>
                          <th className="text-right text-xs font-medium text-gray-500 pb-3">占比</th>
                          <th className="text-right text-xs font-medium text-gray-500 pb-3">质量均分</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplier.brandDistribution.map((brand) => (
                          <tr key={brand.brand} className="border-b border-[#1a1a1a] last:border-0">
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: brandColors[brand.brand] }}
                                />
                                <span className="text-sm text-white">{brand.brand}</span>
                              </div>
                            </td>
                            <td className="py-3 text-right text-sm text-gray-300">{brand.count}</td>
                            <td className="py-3 text-right text-sm text-gray-300">{brand.percentage}%</td>
                            <td className="py-3 text-right text-sm text-gray-300">{brand.avgQuality.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            {/* Tab 2: Price Positioning */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">价格带定位</h3>

              <div className="bg-[#111111] rounded-xl p-6 border border-[#262626]">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#262626]">
                        <th className="text-left text-xs font-medium text-gray-500 pb-3">品类</th>
                        <th className="text-right text-xs font-medium text-gray-500 pb-3">供应商低价</th>
                        <th className="text-right text-xs font-medium text-gray-500 pb-3">供应商高价</th>
                        <th className="text-right text-xs font-medium text-gray-500 pb-3">市场均价</th>
                        <th className="text-right text-xs font-medium text-gray-500 pb-3">价差</th>
                        <th className="text-center text-xs font-medium text-gray-500 pb-3">定位</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplier.pricePositioning.map((item) => (
                        <tr key={item.category} className="border-b border-[#1a1a1a] last:border-0">
                          <td className="py-3 text-sm text-white">{item.category}</td>
                          <td className="py-3 text-right text-sm text-gray-300">
                            ¥{item.lowPrice.toLocaleString()}
                          </td>
                          <td className="py-3 text-right text-sm text-gray-300">
                            ¥{item.highPrice.toLocaleString()}
                          </td>
                          <td className="py-3 text-right text-sm text-gray-300">
                            ¥{item.marketAvg.toLocaleString()}
                          </td>
                          <td className={`py-3 text-right text-sm ${item.diff < 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {item.diff > 0 ? '+' : ''}{item.diff}%
                          </td>
                          <td className="py-3 text-center">
                            <PositionBadge position={item.position} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="mt-4 pt-4 border-t border-[#262626] flex flex-wrap gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">偏低</span>
                    <span>低于市场价</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">适中</span>
                    <span>±15%以内</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">偏高</span>
                    <span>高于市场价</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Tab 3: Historical Timeline */}
            <section>
              <h3 className="text-lg font-semibold text-white mb-4">历史时间线</h3>

              <div className="bg-[#111111] rounded-xl p-6 border border-[#262626]">
                <div className="relative">
                  {/* Vertical Timeline Line */}
                  <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-[#262626]" />

                  {/* Timeline Events */}
                  <div className="space-y-6">
                    {supplier.timeline.map((event, index) => (
                      <div key={index} className="relative flex gap-4">
                        {/* Timeline Dot */}
                        <div className="relative z-10">
                          <TimelineDot type={event.type} />
                        </div>

                        {/* Event Content */}
                        <div className="flex-1 pb-6">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs text-gray-500">{event.date}</span>
                            <span className="text-sm font-medium text-white">{event.event}</span>
                          </div>
                          <p className="text-sm text-gray-400 mt-1">{event.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
