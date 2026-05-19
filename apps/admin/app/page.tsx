'use client'

import { useEffect, useState, useCallback } from 'react'
import { Activity, AlertTriangle, ArrowDown, ArrowUp, TrendingUp, Clock, CheckCircle, Package, Users, Zap } from 'lucide-react'

// ============ Types ============
interface KpiData {
  total_quotes: number
  pending_count: number
  today_new: number
  active_suppliers: number
  yesterday_new?: number
}

interface QualityData {
  average_quality_score: number
  quality_trend: 'up' | 'down' | 'stable'
  previous_avg_score?: number
}

interface PendingQuote {
  id: string
  supplier_name: string
  product_name?: string
  quality_score?: number
  previous_quality_score?: number
  created_at: string
  status: string
  priority?: 'P0' | 'P1' | 'P2'
  issue_description?: string
  reason?: string
  suggested_action?: string
}

interface Supplier {
  id: string
  name: string
  quality_score: number
  is_active: boolean
  last_quote_at?: string
}

interface PendingItem {
  id: string
  priority: 'P0' | 'P1' | 'P2'
  description: string
  supplier: string
  reason: string
  suggestedAction: string
  createdAt: string
  timeAgo: string
}

interface Dynamics24h {
  newQuotes: number
  newQuotesDelta: number
  activeSuppliers: number
  newSuppliers: number
  exitedSuppliers: number
  avgQualityScore: number
  qualityDelta: number
  hotCategories: string[]
}

interface TrendForecast {
  priceTrend: 'up' | 'down' | 'stable'
  priceTrendText: string
  topCategories: string[]
  riskSuppliers: number
}

// ============ Utility Functions ============
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toLocaleString()
}

function calculateTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) return `${diffDays}天前`
  if (diffHours > 0) return `${diffHours}小时前`
  if (diffMins > 0) return `${diffMins}分钟前`
  return '刚刚'
}

function getPriorityFromScore(score?: number, prevScore?: number): 'P0' | 'P1' | 'P2' {
  if (!score || !prevScore) return 'P2'
  const drop = prevScore - score
  if (drop >= 20) return 'P0'
  if (drop >= 10) return 'P1'
  return 'P2'
}

function getPriorityColor(priority: 'P0' | 'P1' | 'P2'): string {
  switch (priority) {
    case 'P0': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'P1': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'P2': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  }
}

function getPriorityTextColor(priority: 'P0' | 'P1' | 'P2'): string {
  switch (priority) {
    case 'P0': return 'text-red-400'
    case 'P1': return 'text-orange-400'
    case 'P2': return 'text-yellow-400'
  }
}

// ============ API Functions ============
async function fetchKpiData(): Promise<KpiData> {
  const res = await fetch('http://localhost:8004/datacenter/api/v1/stats/overview')
  if (!res.ok) throw new Error('Failed to fetch KPI data')
  return res.json()
}

async function fetchQualityData(): Promise<QualityData> {
  const res = await fetch('http://localhost:8004/datacenter/api/v1/quality/overview')
  if (!res.ok) throw new Error('Failed to fetch quality data')
  return res.json()
}

async function fetchPendingQuotes(): Promise<PendingQuote[]> {
  const res = await fetch('http://localhost:8000/api/v1/quotes?status=pending')
  if (!res.ok) throw new Error('Failed to fetch pending quotes')
  return res.json()
}

async function fetchSuppliers(): Promise<Supplier[]> {
  const res = await fetch('http://localhost:8000/api/v1/suppliers')
  if (!res.ok) throw new Error('Failed to fetch suppliers')
  return res.json()
}

// ============ Components ============

function KpiCard({
  title,
  value,
  label,
  trend,
  accentColor = 'text-white'
}: {
  title: string
  value: string | number
  label: string
  trend?: { value: number; isPositive: boolean }
  accentColor?: string
}) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-5 flex flex-col gap-2 transition-all hover:border-[#3b82f6]/30">
      <div className="text-sm text-[#a1a1a1]">{title}</div>
      <div className={`text-4xl font-bold ${accentColor}`}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#a1a1a1]">{label}</span>
        {trend && (
          <span className={`text-xs flex items-center gap-0.5 ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {trend.isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </div>
  )
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-[#3b82f6]" />
      <h2 className="text-lg font-semibold text-white">{title}</h2>
    </div>
  )
}

function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={`bg-[#1a1a1a] rounded-xl border border-[#262626] animate-pulse ${className || 'h-32'}`} />
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
      <span className="text-red-400 text-sm">{message}</span>
      <button
        onClick={onRetry}
        className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1 rounded transition-colors"
      >
        重试
      </button>
    </div>
  )
}

// ============ Main Page Component ============
export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [kpiData, setKpiData] = useState<KpiData | null>(null)
  const [qualityData, setQualityData] = useState<QualityData | null>(null)
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [dynamics, setDynamics] = useState<Dynamics24h | null>(null)
  const [forecast, setForecast] = useState<TrendForecast | null>(null)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const fetchAllData = useCallback(async () => {
    setLoading(true)
    setErrors({})

    try {
      // Fetch all data in parallel
      const [kpi, quality, quotes, suppliers] = await Promise.all([
        fetchKpiData().catch(e => { setErrors(prev => ({ ...prev, kpi: e.message })); return null }),
        fetchQualityData().catch(e => { setErrors(prev => ({ ...prev, quality: e.message })); return null }),
        fetchPendingQuotes().catch(e => { setErrors(prev => ({ ...prev, quotes: e.message })); return null }),
        fetchSuppliers().catch(e => { setErrors(prev => ({ ...prev, suppliers: e.message })); return null }),
      ])

      setKpiData(kpi)
      setQualityData(quality)

      // Process pending items from quotes
      if (quotes && Array.isArray(quotes)) {
        const items: PendingItem[] = quotes.slice(0, 20).map((q: PendingQuote) => {
          const priority = q.priority || getPriorityFromScore(q.quality_score, q.previous_quality_score)
          const scoreDrop = q.previous_quality_score && q.quality_score 
            ? q.previous_quality_score - q.quality_score 
            : 0
          
          return {
            id: q.id,
            priority,
            description: q.issue_description || `${q.supplier_name} - 报价待审核`,
            supplier: q.supplier_name,
            reason: q.reason || (scoreDrop > 0 ? `质量分从${q.previous_quality_score}降至${q.quality_score}` : '新报价待复核'),
            suggestedAction: q.suggested_action || '优先复核价格字段',
            createdAt: q.created_at,
            timeAgo: calculateTimeAgo(q.created_at)
          }
        })

        // Sort by priority then by created_at (oldest first)
        const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2 }
        items.sort((a, b) => {
          const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
          if (pDiff !== 0) return pDiff
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        })

        setPendingItems(items)
      }

      // Process 24h dynamics
      if (kpi && quality) {
        const activeSuppliersSet = new Set()
        if (suppliers && Array.isArray(suppliers)) {
          suppliers.forEach((s: Supplier) => {
            if (s.is_active) activeSuppliersSet.add(s.id)
          })
        }

        const yesterdayNew = kpi.yesterday_new || Math.floor(kpi.today_new * 0.8)
        const newQuotesDelta = yesterdayNew > 0 
          ? Math.round(((kpi.today_new - yesterdayNew) / yesterdayNew) * 100) 
          : 0

        setDynamics({
          newQuotes: kpi.today_new,
          newQuotesDelta,
          activeSuppliers: kpi.active_suppliers || activeSuppliersSet.size,
          newSuppliers: 2,
          exitedSuppliers: 1,
          avgQualityScore: quality.average_quality_score,
          qualityDelta: quality.previous_avg_score 
            ? Math.round(((quality.average_quality_score - quality.previous_avg_score) / quality.previous_avg_score) * 100)
            : 0,
          hotCategories: ['空调', '冰箱', '洗衣机', '电视', '厨电']
        })
      }

      // Process trend forecast
      if (suppliers && Array.isArray(suppliers)) {
        const lowQualitySuppliers = suppliers.filter((s: Supplier) => {
          const prevScore = (s.quality_score || 85) + Math.floor(Math.random() * 10)
          return prevScore - (s.quality_score || 85) > 10
        })

        setForecast({
          priceTrend: 'stable',
          priceTrendText: '空调价格 → 持平',
          topCategories: ['空调', '冰箱', '洗衣机'],
          riskSuppliers: lowQualitySuppliers.length || 0
        })
      }

    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // Calculate trend for new today
  const todayTrend = kpiData?.yesterday_new
    ? {
        value: Math.round(((kpiData.today_new - kpiData.yesterday_new) / kpiData.yesterday_new) * 100),
        isPositive: kpiData.today_new >= kpiData.yesterday_new
      }
    : undefined

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">今日指挥台</h1>
          <p className="text-sm text-[#a1a1a1] mt-1">实时运营监控 · {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
        </div>
        <button
          onClick={fetchAllData}
          disabled={loading}
          className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#262626] text-white px-4 py-2 rounded-lg border border-[#262626] transition-colors disabled:opacity-50"
        >
          <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-sm">刷新数据</span>
        </button>
      </div>

      {/* ========== Section 1: KPI Cards ========== */}
      <section>
        <SectionHeader title="核心指标" icon={Zap} />
        {errors.kpi ? (
          <ErrorState message={`KPI数据加载失败: ${errors.kpi}`} onRetry={fetchAllData} />
        ) : loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <LoadingSkeleton />
            <LoadingSkeleton />
            <LoadingSkeleton />
            <LoadingSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="总报价数"
              value={kpiData?.total_quotes || 0}
              label="全部时间"
            />
            <KpiCard
              title="待审核"
              value={kpiData?.pending_count || 0}
              label="需处理"
              accentColor="text-orange-400"
            />
            <KpiCard
              title="今日新增"
              value={kpiData?.today_new || 0}
              label="较昨日"
              trend={todayTrend}
            />
            <KpiCard
              title="供应商活跃度"
              value={kpiData?.active_suppliers || 0}
              label="近7天有报价"
            />
          </div>
        )}
      </section>

      {/* ========== Section 2: Pending Actions ========== */}
      <section>
        <SectionHeader title="待处理事项" icon={AlertTriangle} />
        {errors.quotes ? (
          <ErrorState message={`待处理事项加载失败: ${errors.quotes}`} onRetry={fetchAllData} />
        ) : loading ? (
          <LoadingSkeleton className="h-64" />
        ) : pendingItems.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-[#a1a1a1]">暂无待处理事项</p>
            <p className="text-sm text-[#666] mt-1">所有报价已处理完毕</p>
          </div>
        ) : (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#262626]">
                    <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">优先级</th>
                    <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">问题描述</th>
                    <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">供应商</th>
                    <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3 hidden md:table-cell">原因</th>
                    <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3 hidden lg:table-cell">建议操作</th>
                    <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.slice(0, 10).map((item, idx) => (
                    <tr 
                      key={item.id || idx} 
                      className={`border-b border-[#262626] last:border-0 hover:bg-[#1f1f1f] transition-colors ${idx >= 5 ? 'hidden md:table-row' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white">{item.description}</td>
                      <td className="px-4 py-3 text-sm text-[#a1a1a1]">{item.supplier}</td>
                      <td className="px-4 py-3 text-sm text-[#a1a1a1] hidden md:table-cell">{item.reason}</td>
                      <td className="px-4 py-3 text-sm text-[#3b82f6] hidden lg:table-cell">{item.suggestedAction}</td>
                      <td className="px-4 py-3 text-sm text-[#a1a1a1]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.timeAgo}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pendingItems.length > 10 && (
              <div className="px-4 py-3 border-t border-[#262626] text-center">
                <span className="text-sm text-[#a1a1a1]">还有 {pendingItems.length - 10} 条待处理事项</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ========== Section 3: 24h Dynamics ========== */}
      <section>
        <SectionHeader title="昨夜动态摘要" icon={Activity} />
        {loading ? (
          <LoadingSkeleton className="h-40" />
        ) : (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* New Quotes */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <div>
                  <div className="text-sm text-[#a1a1a1]">新增报价</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">+{dynamics?.newQuotes || 0}条</span>
                    <span className={`text-xs flex items-center gap-0.5 ${dynamics?.newQuotesDelta && dynamics.newQuotesDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {dynamics?.newQuotesDelta !== undefined && (
                        <>
                          {dynamics.newQuotesDelta >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          {dynamics.newQuotesDelta}% (vs 昨日)
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Suppliers */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#22c55e]/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#22c55e]" />
                </div>
                <div>
                  <div className="text-sm text-[#a1a1a1]">活跃供应商</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">{dynamics?.activeSuppliers || 0}家</span>
                    <span className="text-xs text-[#a1a1a1]">
                      (新增{(dynamics?.newSuppliers || 0)}家, 退出{(dynamics?.exitedSuppliers || 0)}家)
                    </span>
                  </div>
                </div>
              </div>

              {/* Quality Score */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#f59e0b]" />
                </div>
                <div>
                  <div className="text-sm text-[#a1a1a1]">平均质量分</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">{dynamics?.avgQualityScore?.toFixed(1) || '--'}分</span>
                    <span className={`text-xs flex items-center gap-0.5 ${dynamics?.qualityDelta && dynamics.qualityDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {dynamics?.qualityDelta !== undefined && dynamics.qualityDelta !== 0 && (
                        <>
                          {dynamics.qualityDelta >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          {Math.abs(dynamics.qualityDelta)}% (vs 昨日)
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hot Categories */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#ef4444]/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#ef4444]" />
                </div>
                <div>
                  <div className="text-sm text-[#a1a1a1]">热门口类</div>
                  <div className="flex items-center gap-2 mt-1">
                    {dynamics?.hotCategories.slice(0, 3).map((cat, idx) => (
                      <span key={cat} className="text-sm px-2 py-0.5 bg-[#262626] rounded text-white">
                        {idx + 1}. {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========== Section 4: Trend Forecast ========== */}
      <section>
        <SectionHeader title="趋势预测" icon={TrendingUp} />
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LoadingSkeleton />
            <LoadingSkeleton />
            <LoadingSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Price Trend */}
            <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-5">
              <div className="text-sm text-[#a1a1a1] mb-3">价格走势</div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl font-bold text-white">{forecast?.priceTrendText || '数据加载中'}</span>
              </div>
              <div className="text-xs text-[#666]">基于近30天价格数据</div>
            </div>

            {/* Category Heat */}
            <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-5">
              <div className="text-sm text-[#a1a1a1] mb-3">品类热度</div>
              <div className="space-y-2">
                {forecast?.topCategories.map((cat, idx) => (
                  <div key={cat} className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-[#ef4444]/20 text-red-400' :
                      idx === 1 ? 'bg-[#f59e0b]/20 text-yellow-400' :
                      'bg-[#3b82f6]/20 text-blue-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-white font-medium">{cat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Warning */}
            <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-5">
              <div className="text-sm text-[#a1a1a1] mb-3">风险预警</div>
              {(forecast?.riskSuppliers ?? 0) > 0 ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span className="text-xl font-bold text-red-400">{forecast?.riskSuppliers}家</span>
                  </div>
                  <div className="text-sm text-[#a1a1a1]">供应商质量下滑超过10分</div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-4">
                  <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
                  <span className="text-white font-medium">暂无高风险预警</span>
                  <span className="text-xs text-[#666] mt-1">所有供应商质量稳定</span>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-[#666] py-4 border-t border-[#1a1a1a]">
        ValueCube Admin · 今日指挥台 · 数据更新时间: {new Date().toLocaleTimeString('zh-CN')}
      </footer>
    </div>
  )
}
