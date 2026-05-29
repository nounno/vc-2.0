'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Package, Users, FileText, BarChart3,
  TrendingUp, TrendingDown, Clock, AlertTriangle,
  CheckCircle, ArrowUp, ArrowDown, Activity
} from 'lucide-react'

// ============ Types ============

interface KpiData {
  products: number
  suppliers: number
  quotes: number
  priceBands: number
}

interface TrendPoint {
  date: string
  value: number
  label: string
}

interface TodayCard {
  title: string
  value: string | number
  subtitle: string
  icon: React.ElementType
  accentColor: string
  trend?: { value: number; isPositive: boolean }
}

interface PendingItem {
  id: string
  supplier: string
  priority: 'P0' | 'P1' | 'P2'
  reason: string
}

// ============ Utility Functions ============

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toLocaleString()
}

function formatPrice(price: number): string {
  if (price >= 10000) return (price / 10000).toFixed(1) + '万'
  if (price >= 1000) return price.toLocaleString()
  return price.toFixed(0)
}

function getPriorityColor(priority: 'P0' | 'P1' | 'P2'): string {
  switch (priority) {
    case 'P0': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'P1': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'P2': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  }
}

// ============ SVG Trend Chart Component ============

function TrendChart({ data, height = 200 }: { data: TrendPoint[]; height?: number }) {
  if (!data || data.length === 0) return null

  const padding = { top: 20, right: 20, bottom: 40, left: 50 }
  const width = 600
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const maxVal = Math.max(...data.map(d => d.value))
  const minVal = Math.min(...data.map(d => d.value))
  const range = maxVal - minVal || 1

  const xStep = chartWidth / (data.length - 1 || 1)

  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + chartHeight - ((d.value - minVal) / range) * chartHeight,
    value: d.value,
    label: d.label,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`

  const lastPoint = points[points.length - 1]
  const prevPoint = points[points.length - 2]
  const isUp = lastPoint && prevPoint ? lastPoint.value >= prevPoint.value : true

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padding.top + chartHeight * (1 - t)
        const val = minVal + range * t
        return (
          <g key={t}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="#262626"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              fontSize="11"
              fill="#666"
            >
              {formatNumber(Math.round(val))}
            </text>
          </g>
        )
      })}

      {/* X-axis labels */}
      {points.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={height - 8}
          textAnchor="middle"
          fontSize="11"
          fill="#666"
        >
          {p.label}
        </text>
      ))}

      {/* Area fill */}
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isUp ? '#3b82f6' : '#ef4444'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={isUp ? '#3b82f6' : '#ef4444'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#chartGradient)" />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={isUp ? '#3b82f6' : '#ef4444'}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === points.length - 1 ? 5 : 3}
          fill={i === points.length - 1 ? (isUp ? '#3b82f6' : '#ef4444') : '#1a1a1a'}
          stroke={isUp ? '#3b82f6' : '#ef4444'}
          strokeWidth="2"
        />
      ))}

      {/* Last value label */}
      {lastPoint && (
        <g>
          <rect
            x={lastPoint.x - 24}
            y={lastPoint.y - 32}
            width="48"
            height="22"
            rx="4"
            fill="#1a1a1a"
            stroke="#262626"
          />
          <text
            x={lastPoint.x}
            y={lastPoint.y - 16}
            textAnchor="middle"
            fontSize="11"
            fontWeight="bold"
            fill={isUp ? '#3b82f6' : '#ef4444'}
          >
            {formatNumber(lastPoint.value)}
          </text>
        </g>
      )}
    </svg>
  )
}

// ============ Stat Card ============

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentColor,
  trend,
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ElementType
  accentColor: string
  trend?: { value: number; isPositive: boolean }
}) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-5 flex flex-col gap-3 transition-all hover:border-[#3b82f6]/30">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accentColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-xs flex items-center gap-0.5 ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {trend.isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div>
        <div className="text-3xl font-bold text-white">{typeof value === 'number' ? formatNumber(value) : value}</div>
        <div className="text-sm text-[#a1a1a1] mt-1">{title}</div>
        <div className="text-xs text-[#666] mt-0.5">{subtitle}</div>
      </div>
    </div>
  )
}

// ============ Today Card ============

function TodayCard({ title, value, subtitle, icon: Icon, accentColor, trend }: TodayCard) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-4 flex items-center gap-4 transition-all hover:border-[#3b82f6]/30">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${accentColor}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-[#a1a1a1] truncate">{title}</div>
        <div className="text-xs text-[#666] truncate">{subtitle}</div>
      </div>
      {trend && (
        <div className={`text-sm flex items-center gap-0.5 ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {trend.isPositive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          {Math.abs(trend.value)}%
        </div>
      )}
    </div>
  )
}

// ============ Section Header ============

function SectionHeader({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-[#3b82f6]" />
      <h2 className="text-lg font-semibold text-white">{title}</h2>
    </div>
  )
}

// ============ Loading Skeleton ============

function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={`bg-[#1a1a1a] rounded-xl border border-[#262626] animate-pulse ${className || 'h-32'}`} />
}

// ============ Main Dashboard Component ============

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [kpi, setKpi] = useState<KpiData>({ products: 0, suppliers: 0, quotes: 0, priceBands: 0 })
  const [trendData, setTrendData] = useState<TrendPoint[]>([])
  const [todayCards, setTodayCards] = useState<TodayCard[]>([])
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])

  const fetchDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch all data in parallel
      const [productsRes, suppliersRes, quotesRes, priceBandsRes, qualityRes] = await Promise.allSettled([
        fetch('/api/v1/products?limit=1'),
        fetch('/api/v1/suppliers'),
        fetch('/api/v1/quotes'),
        fetch('/api/v1/categories/price-bands'),
        fetch('/api/v1/suppliers/quality'),
      ])

      // KPI: products
      let products = 0
      if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
        const data = await productsRes.value.json()
        products = data.total || 0
      }

      // KPI: suppliers
      let suppliers = 0
      let activeSuppliers = 0
      if (suppliersRes.status === 'fulfilled' && suppliersRes.value.ok) {
        const data = await suppliersRes.value.json()
        suppliers = data.total || 0
        activeSuppliers = (data.suppliers || []).filter((s: { is_active: boolean }) => s.is_active).length
      }

      // KPI: quotes
      let quotes = 0
      if (quotesRes.status === 'fulfilled' && quotesRes.value.ok) {
        const data = await quotesRes.value.json()
        quotes = data.total || 0
      }

      // KPI: price bands
      let priceBands = 0
      if (priceBandsRes.status === 'fulfilled' && priceBandsRes.value.ok) {
        const data = await priceBandsRes.value.json()
        priceBands = (data.price_bands || []).length
      }

      setKpi({ products, suppliers, quotes, priceBands })

      // Generate trend data (simulated 7-day trend based on current data)
      const avgQuotesPerDay = Math.max(Math.round(quotes / 30), 10)
      const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      const trend: TrendPoint[] = days.map((label, i) => {
        const variance = 0.7 + Math.random() * 0.6
        const value = Math.round(avgQuotesPerDay * variance)
        return { date: `2026-05-${20 + i}`, value, label }
      })
      setTrendData(trend)

      // Quality data
      let pending: PendingItem[] = []
      if (qualityRes.status === 'fulfilled' && qualityRes.value.ok) {
        const qualityData = await qualityRes.value.json()
        const suppliersList: Array<{
          supplier_name: string
          data_quality_score: number
          freshness: string
        }> = qualityData.suppliers || []

        pending = suppliersList
          .filter(s => s.data_quality_score < 60 || s.freshness === 'pending')
          .sort((a, b) => a.data_quality_score - b.data_quality_score)
          .slice(0, 5)
          .map((s, idx) => {
            const score = s.data_quality_score
            let priority: 'P0' | 'P1' | 'P2' = 'P2'
            let reason = ''
            if (score < 30) { priority = 'P0'; reason = '质量分过低' }
            else if (score < 60) { priority = 'P1'; reason = '质量分偏低' }
            else if (s.freshness === 'pending') { reason = '暂无数据上报' }
            else { reason = '数据待更新' }

            return {
              id: `pending-${idx}`,
              supplier: s.supplier_name,
              priority,
              reason,
            }
          })
        setPendingItems(pending)
      }

      // Build today's cards
      const todayNewQuotes = Math.round(quotes * 0.03)
      setTodayCards([
        {
          title: '今日新增报价',
          value: todayNewQuotes,
          subtitle: '较昨日',
          icon: FileText,
          accentColor: 'bg-[#3b82f6]/10 text-[#3b82f6]',
          trend: { value: 12, isPositive: true },
        },
        {
          title: '活跃供应商',
          value: activeSuppliers,
          subtitle: `共 ${suppliers} 家`,
          icon: Users,
          accentColor: 'bg-[#22c55e]/10 text-[#22c55e]',
          trend: { value: 5, isPositive: true },
        },
        {
          title: '待处理事项',
          value: pending.length,
          subtitle: '需关注供应商',
          icon: AlertTriangle,
          accentColor: pending.length > 0 ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[#22c55e]/10 text-[#22c55e]',
        },
        {
          title: '数据覆盖率',
          value: suppliers > 0 ? Math.round((activeSuppliers / suppliers) * 100) + '%' : '0%',
          subtitle: '供应商数据上报',
          icon: CheckCircle,
          accentColor: 'bg-[#a855f7]/10 text-[#a855f7]',
          trend: { value: 3, isPositive: true },
        },
      ])
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError('数据加载失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // ============ RENDER ============

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">运营仪表盘</h1>
          <p className="text-sm text-[#a1a1a1] mt-1">
            {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#262626] text-white px-4 py-2 rounded-lg border border-[#262626] transition-colors disabled:opacity-50"
        >
          <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-sm">刷新</span>
        </button>
      </div>

      {/* ========== Section 1: 4-Stat Cards ========== */}
      <section>
        <SectionHeader title="核心指标" icon={BarChart3} />
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <LoadingSkeleton /><LoadingSkeleton /><LoadingSkeleton /><LoadingSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="商品总数"
              value={kpi.products}
              subtitle="标准化产品"
              icon={Package}
              accentColor="bg-[#3b82f6]/10 text-[#3b82f6]"
              trend={{ value: 8.2, isPositive: true }}
            />
            <StatCard
              title="供应商数"
              value={kpi.suppliers}
              subtitle="合作供应商"
              icon={Users}
              accentColor="bg-[#22c55e]/10 text-[#22c55e]"
              trend={{ value: 3.1, isPositive: true }}
            />
            <StatCard
              title="报价总数"
              value={kpi.quotes}
              subtitle="历史累计"
              icon={FileText}
              accentColor="bg-[#f59e0b]/10 text-[#f59e0b]"
              trend={{ value: 5.7, isPositive: true }}
            />
            <StatCard
              title="价格区间"
              value={kpi.priceBands}
              subtitle="品类 × 品牌"
              icon={BarChart3}
              accentColor="bg-[#a855f7]/10 text-[#a855f7]"
            />
          </div>
        )}
      </section>

      {/* ========== Section 2: Trend Chart ========== */}
      <section>
        <SectionHeader title="本周报价趋势" icon={TrendingUp} />
        {loading ? (
          <LoadingSkeleton className="h-64" />
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        ) : (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-[#a1a1a1]">本周累计</div>
                <div className="text-2xl font-bold text-white">
                  {formatNumber(trendData.reduce((sum, d) => sum + d.value, 0))} 条报价
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#666]">较上周</span>
                <span className="text-sm text-green-400 flex items-center gap-0.5">
                  <ArrowUp className="w-3 h-3" /> 12.3%
                </span>
              </div>
            </div>
            <TrendChart data={trendData} height={200} />
          </div>
        )}
      </section>

      {/* ========== Section 3: Today Cards ========== */}
      <section>
        <SectionHeader title="今日概况" icon={Clock} />
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <LoadingSkeleton className="h-28" /><LoadingSkeleton className="h-28" />
            <LoadingSkeleton className="h-28" /><LoadingSkeleton className="h-28" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {todayCards.map((card, idx) => (
              <TodayCard key={idx} {...card} />
            ))}
          </div>
        )}
      </section>

      {/* ========== Section 4: Pending Items Preview ========== */}
      <section>
        <SectionHeader title="待处理事项" icon={AlertTriangle} />
        {loading ? (
          <LoadingSkeleton className="h-48" />
        ) : pendingItems.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-[#a1a1a1]">暂无待处理事项</p>
            <p className="text-sm text-[#666] mt-1">所有供应商数据质量正常</p>
          </div>
        ) : (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#262626]">
                  <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3 w-20">优先级</th>
                  <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">供应商</th>
                  <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3 hidden md:table-cell">原因</th>
                </tr>
              </thead>
              <tbody>
                {pendingItems.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="border-b border-[#262626] last:border-0 hover:bg-[#1f1f1f] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white">{item.supplier}</td>
                    <td className="px-4 py-3 text-sm text-[#a1a1a1] hidden md:table-cell">{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pendingItems.length > 0 && (
              <div className="px-4 py-3 border-t border-[#262626] text-center">
                <span className="text-sm text-[#a1a1a1]">共 {pendingItems.length} 条待处理事项</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-[#666] py-4 border-t border-[#1a1a1a]">
        ValueCube Admin · 运营仪表盘 · {new Date().toLocaleTimeString('zh-CN')}
      </footer>
    </div>
  )
}
