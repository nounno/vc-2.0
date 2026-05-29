'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Activity, AlertTriangle, ArrowDown, ArrowUp, TrendingUp,
  Clock, CheckCircle, Users, Zap, BarChart3,
  ShieldCheck, Target
} from 'lucide-react'

// ============ Types ============

interface SupplierQuality {
  supplier_name: string
  total_records: number
  parse_success_rate: number
  data_quality_score: number
  total_brands: number
  price_tier: string
  freshness: string
  avg_price: number
}

interface SupplierItem {
  id: string
  name: string
  quality_score: number
  is_active: boolean
  last_quote_at: string | null
}

interface PriceBand {
  id: number
  category: string
  price_min: number
  price_max: number
  price_avg: number
  price_p25: number
  price_p75: number
  sample_count: number
  brand: string
  updated_at: string
}

interface PendingItem {
  id: string
  priority: 'P0' | 'P1' | 'P2'
  description: string
  supplier: string
  reason: string
  suggestedAction: string
}

// ============ Utility Functions ============

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toLocaleString()
}

function formatPrice(price: number): string {
  if (price >= 10000) {
    return (price / 10000).toFixed(1) + '万'
  }
  if (price >= 1000) {
    return price.toLocaleString()
  }
  return price.toFixed(0)
}

const CATEGORY_LABELS: Record<string, string> = {
  'WASHER': '洗衣机',
  'REFRIGERATOR': '冰箱',
  'TV': '电视',
  'DRYER': '烘干机',
  'FREEZER': '冷柜',
  'INTEGRATED_STOVE': '集成灶',
  'DISHWASHER': '洗碗机',
}

function getCategoryLabel(code: string): string {
  return CATEGORY_LABELS[code] || code
}

function getPriorityFromScore(score: number): 'P0' | 'P1' | 'P2' {
  if (score < 30) return 'P0'
  if (score < 60) return 'P1'
  return 'P2'
}

function getPriorityColor(priority: 'P0' | 'P1' | 'P2'): string {
  switch (priority) {
    case 'P0': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'P1': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'P2': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  }
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

function EmptyState({ message, subMessage }: { message: string; subMessage?: string }) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-8 text-center">
      <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
      <p className="text-[#a1a1a1]">{message}</p>
      {subMessage && <p className="text-sm text-[#666] mt-1">{subMessage}</p>}
    </div>
  )
}

// ============ Main Page Component ============

export default function AdminPage() {
  // ── Independent section states ──
  const [loadingKpi, setLoadingKpi] = useState(true)
  const [loadingPending, setLoadingPending] = useState(true)
  const [loadingOverview, setLoadingOverview] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingQualityDist, setLoadingQualityDist] = useState(true)

  const [errorKpi, setErrorKpi] = useState<string | null>(null)
  const [errorPending, setErrorPending] = useState<string | null>(null)
  const [errorOverview, setErrorOverview] = useState<string | null>(null)
  const [errorCategories, setErrorCategories] = useState<string | null>(null)
  const [errorQualityDist, setErrorQualityDist] = useState<string | null>(null)

  // KPI data
  const [kpiProducts, setKpiProducts] = useState(0)
  const [kpiSuppliers, setKpiSuppliers] = useState(0)
  const [kpiQuotes, setKpiQuotes] = useState(0)
  const [kpiPriceBands, setKpiPriceBands] = useState(0)

  // Pending items
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])

  // Overview
  const [overviewActiveSuppliers, setOverviewActiveSuppliers] = useState(0)
  const [overviewAvgQuality, setOverviewAvgQuality] = useState(0)
  const [overviewAvgParseRate, setOverviewAvgParseRate] = useState(0)

  // Categories
  const [categories, setCategories] = useState<PriceBand[]>([])

  // Quality distribution
  const [qualityHigh, setQualityHigh] = useState(0)
  const [qualityMid, setQualityMid] = useState(0)
  const [qualityLow, setQualityLow] = useState(0)

  // ── Data fetching ──

  const fetchAllData = useCallback(async () => {
    // Reset states
    setLoadingKpi(true); setLoadingPending(true); setLoadingOverview(true)
    setLoadingCategories(true); setLoadingQualityDist(true)
    setErrorKpi(null); setErrorPending(null); setErrorOverview(null)
    setErrorCategories(null); setErrorQualityDist(null)

    // ── Fetch KPI data (products + suppliers + quotes + price-bands) ──
    try {
      const [productsRes, suppliersRes, quotesRes, priceBandsRes] = await Promise.allSettled([
        fetch('/api/v1/products?limit=1'),
        fetch('/api/v1/suppliers'),
        fetch('/api/v1/quotes'),
        fetch('/api/v1/categories/price-bands'),
      ])

      if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
        const data = await productsRes.value.json()
        setKpiProducts(data.total || 0)
      }

      if (suppliersRes.status === 'fulfilled' && suppliersRes.value.ok) {
        const data = await suppliersRes.value.json()
        setKpiSuppliers(data.total || 0)
      }

      if (quotesRes.status === 'fulfilled' && quotesRes.value.ok) {
        const data = await quotesRes.value.json()
        setKpiQuotes(data.total || 0)
      }

      if (priceBandsRes.status === 'fulfilled' && priceBandsRes.value.ok) {
        const data = await priceBandsRes.value.json()
        const bands = data.price_bands || []
        setKpiPriceBands(bands.length)
        // Also populate categories section
        setCategories(bands)
        setLoadingCategories(false)
      } else {
        setErrorCategories('品类数据加载失败')
        setLoadingCategories(false)
      }
    } catch (err) {
      console.error('KPI fetch error:', err)
    } finally {
      setLoadingKpi(false)
    }

    // ── Fetch quality data (shared by pending, overview, quality-dist) ──
    try {
      const qualityRes = await fetch('/api/v1/suppliers/quality')
      if (!qualityRes.ok) {
        setErrorPending('质量数据加载失败')
        setErrorOverview('质量数据加载失败')
        setErrorQualityDist('质量数据加载失败')
        setLoadingPending(false)
        setLoadingOverview(false)
        setLoadingQualityDist(false)
      } else {
        const qualityData = await qualityRes.json()
        const suppliers: SupplierQuality[] = qualityData.suppliers || []

        // ── Pending items: filter quality_score < 60 or freshness = 'pending' ──
        const pending: PendingItem[] = suppliers
          .filter(s => s.data_quality_score < 60 || s.freshness === 'pending')
          .sort((a, b) => a.data_quality_score - b.data_quality_score)
          .map((s, idx) => {
            const score = s.data_quality_score
            const priority = getPriorityFromScore(score)
            let reason = ''
            let suggestedAction = ''

            if (s.freshness === 'pending' && score === 0) {
              reason = '暂无数据上报'
              suggestedAction = '联系供应商提交数据'
            } else if (score < 30) {
              reason = `质量分过低 (${score.toFixed(0)}分)`
              suggestedAction = '需重点核查 — 检查数据源和解析逻辑'
            } else if (score < 60) {
              reason = `质量分偏低 (${score.toFixed(0)}分)`
              suggestedAction = '复核数据质量，优化清洗规则'
            } else {
              reason = `数据待更新 (freshness: ${s.freshness})`
              suggestedAction = '检查数据同步状态'
            }

            return {
              id: `pending-${idx}`,
              priority,
              description: `${s.supplier_name} - ${reason}`,
              supplier: s.supplier_name,
              reason,
              suggestedAction,
            }
          })

        setPendingItems(pending)
        setLoadingPending(false)

        // ── Overview: avg quality, avg parse rate ──
        if (suppliers.length > 0) {
          const totalQuality = suppliers.reduce((sum, s) => sum + s.data_quality_score, 0)
          const totalParse = suppliers.reduce((sum, s) => sum + s.parse_success_rate, 0)
          setOverviewAvgQuality(totalQuality / suppliers.length)
          setOverviewAvgParseRate(totalParse / suppliers.length)
        }
        setLoadingOverview(false)

        // ── Quality distribution ──
        const high = suppliers.filter(s => s.data_quality_score >= 80).length
        const mid = suppliers.filter(s => s.data_quality_score >= 50 && s.data_quality_score < 80).length
        const low = suppliers.filter(s => s.data_quality_score < 50).length
        setQualityHigh(high)
        setQualityMid(mid)
        setQualityLow(low)
        setLoadingQualityDist(false)
      }
    } catch (err) {
      console.error('Quality fetch error:', err)
      setErrorPending('网络错误')
      setErrorOverview('网络错误')
      setErrorQualityDist('网络错误')
      setLoadingPending(false)
      setLoadingOverview(false)
      setLoadingQualityDist(false)
    }

    // ── Fetch suppliers for active count ──
    try {
      const suppliersRes = await fetch('/api/v1/suppliers')
      if (suppliersRes.ok) {
        const data = await suppliersRes.json()
        const supplierList: SupplierItem[] = data.suppliers || []
        const active = supplierList.filter(s => s.is_active).length
        setOverviewActiveSuppliers(active)
      }
    } catch (err) {
      console.error('Suppliers list fetch error:', err)
    }
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // ── Derived: total supplier count from both sources ──
  const totalQualitySuppliers = qualityHigh + qualityMid + qualityLow

  // ============ RENDER ============

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">数据指挥台</h1>
          <p className="text-sm text-[#a1a1a1] mt-1">
            实时运营监控 · {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>
        <button
          onClick={fetchAllData}
          disabled={loadingKpi}
          className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#262626] text-white px-4 py-2 rounded-lg border border-[#262626] transition-colors disabled:opacity-50"
        >
          <Activity className={`w-4 h-4 ${loadingKpi ? 'animate-spin' : ''}`} />
          <span className="text-sm">刷新数据</span>
        </button>
      </div>

      {/* ========== Section 1: KPI Cards ========== */}
      <section>
        <SectionHeader title="核心指标" icon={Zap} />
        {loadingKpi ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <LoadingSkeleton /><LoadingSkeleton /><LoadingSkeleton /><LoadingSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="商品总数" value={kpiProducts} label="标准化产品" accentColor="text-[#3b82f6]" />
            <KpiCard title="供应商数" value={kpiSuppliers} label="合作供应商" accentColor="text-[#22c55e]" />
            <KpiCard title="报价总数" value={kpiQuotes} label="历史累计" accentColor="text-[#f59e0b]" />
            <KpiCard title="价格区间" value={kpiPriceBands} label="品类 × 品牌" accentColor="text-[#a855f7]" />
          </div>
        )}
      </section>

      {/* ========== Section 2: Pending Items ========== */}
      <section>
        <SectionHeader title="待处理事项" icon={AlertTriangle} />
        {loadingPending ? (
          <LoadingSkeleton className="h-64" />
        ) : errorPending ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <span className="text-red-400 text-sm">{errorPending}</span>
          </div>
        ) : pendingItems.length === 0 ? (
          <EmptyState message="暂无待处理事项" subMessage="所有供应商数据质量正常" />
        ) : (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#262626]">
                    <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3 w-16">优先级</th>
                    <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">供应商</th>
                    <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3 hidden md:table-cell">原因</th>
                    <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3 hidden lg:table-cell">建议操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className={`border-b border-[#262626] last:border-0 hover:bg-[#1f1f1f] transition-colors ${idx >= 5 ? 'hidden md:table-row' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white">{item.supplier}</td>
                      <td className="px-4 py-3 text-sm text-[#a1a1a1] hidden md:table-cell">{item.reason}</td>
                      <td className="px-4 py-3 text-sm text-[#3b82f6] hidden lg:table-cell">{item.suggestedAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pendingItems.length > 5 && (
              <div className="px-4 py-3 border-t border-[#262626] text-center">
                <span className="text-sm text-[#a1a1a1]">共 {pendingItems.length} 条待处理事项</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ========== Section 3: 数据总览 ========== */}
      <section>
        <SectionHeader title="数据总览" icon={Activity} />
        {loadingOverview ? (
          <LoadingSkeleton className="h-40" />
        ) : errorOverview ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <span className="text-red-400 text-sm">{errorOverview}</span>
          </div>
        ) : (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Active Suppliers */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#22c55e]/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#22c55e]" />
                </div>
                <div>
                  <div className="text-sm text-[#a1a1a1]">活跃供应商</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">{overviewActiveSuppliers}家</span>
                    <span className="text-xs text-[#a1a1a1]">
                      / 共 {kpiSuppliers} 家
                    </span>
                  </div>
                </div>
              </div>

              {/* Average Quality Score */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#f59e0b]" />
                </div>
                <div>
                  <div className="text-sm text-[#a1a1a1]">平均质量分</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">
                      {overviewAvgQuality.toFixed(1)}分
                    </span>
                  </div>
                </div>
              </div>

              {/* Average Parse Success Rate */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <div>
                  <div className="text-sm text-[#a1a1a1]">平均解析成功率</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">
                      {(overviewAvgParseRate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Freshness */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#a855f7]/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#a855f7]" />
                </div>
                <div>
                  <div className="text-sm text-[#a1a1a1]">质量分级概览</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm px-2 py-0.5 bg-[#22c55e]/10 text-green-400 rounded">优质 {qualityHigh}家</span>
                    <span className="text-sm px-2 py-0.5 bg-[#f59e0b]/10 text-yellow-400 rounded">中等 {qualityMid}家</span>
                    <span className="text-sm px-2 py-0.5 bg-[#ef4444]/10 text-red-400 rounded">关注 {qualityLow}家</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========== Section 4: 品类热度 ========== */}
      <section>
        <SectionHeader title="品类热度" icon={TrendingUp} />
        {loadingCategories ? (
          <LoadingSkeleton className="h-48" />
        ) : errorCategories ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <span className="text-red-400 text-sm">{errorCategories}</span>
          </div>
        ) : categories.length === 0 ? (
          <EmptyState message="暂无品类数据" />
        ) : (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-5">
            <div className="space-y-3">
              {categories
                .sort((a, b) => b.sample_count - a.sample_count)
                .slice(0, 5)
                .map((cat, idx) => {
                  const maxCount = categories[0]?.sample_count || 1
                  const barWidth = Math.max((cat.sample_count / maxCount) * 100, 3)
                  return (
                    <div key={cat.category} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                        idx === 0 ? 'bg-[#ef4444]/20 text-red-400' :
                        idx === 1 ? 'bg-[#f59e0b]/20 text-yellow-400' :
                        'bg-[#3b82f6]/20 text-blue-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-white text-sm w-20 shrink-0">{getCategoryLabel(cat.category)}</span>
                      <div className="flex-1 h-6 bg-[#0a0a0a] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${barWidth}%`,
                            background: idx === 0
                              ? 'linear-gradient(90deg, #ef4444, #f97316)'
                              : idx === 1
                              ? 'linear-gradient(90deg, #f59e0b, #eab308)'
                              : 'linear-gradient(90deg, #3b82f6, #6366f1)'
                          }}
                        />
                      </div>
                      <span className="text-xs text-[#a1a1a1] w-20 text-right shrink-0">
                        {formatNumber(cat.sample_count)}条
                      </span>
                      <span className="text-xs text-[#666] w-24 text-right shrink-0 hidden sm:block">
                        ¥{formatPrice(cat.price_min)} - ¥{formatPrice(cat.price_max)}
                      </span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </section>

      {/* ========== Section 5: 供应商质量分布（柱状图） ========== */}
      <section>
        <SectionHeader title="供应商质量分布" icon={BarChart3} />
        {loadingQualityDist ? (
          <LoadingSkeleton className="h-48" />
        ) : errorQualityDist ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <span className="text-red-400 text-sm">{errorQualityDist}</span>
          </div>
        ) : totalQualitySuppliers === 0 ? (
          <EmptyState message="暂无质量数据" subMessage="供应商质量数据尚未上报" />
        ) : (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-5">
            <div className="flex items-end justify-around gap-6 h-48 px-4">
              {/* High Quality Bar */}
              <div className="flex flex-col items-center gap-2 flex-1 max-w-[160px]">
                <span className="text-sm font-bold text-white">
                  {qualityHigh}家
                </span>
                <div className="w-full relative flex items-end justify-center" style={{ height: '140px' }}>
                  <div
                    className="w-full max-w-[80px] rounded-t-lg transition-all duration-700"
                    style={{
                      height: totalQualitySuppliers > 0
                        ? `${Math.max((qualityHigh / totalQualitySuppliers) * 100, qualityHigh > 0 ? 8 : 0)}%`
                        : '0%',
                      background: 'linear-gradient(180deg, #22c55e, #16a34a)',
                    }}
                  />
                </div>
                <span className="text-xs text-[#a1a1a1]">高质量</span>
                <span className="text-xs text-[#666]">≥80分</span>
              </div>

              {/* Mid Quality Bar */}
              <div className="flex flex-col items-center gap-2 flex-1 max-w-[160px]">
                <span className="text-sm font-bold text-white">
                  {qualityMid}家
                </span>
                <div className="w-full relative flex items-end justify-center" style={{ height: '140px' }}>
                  <div
                    className="w-full max-w-[80px] rounded-t-lg transition-all duration-700"
                    style={{
                      height: totalQualitySuppliers > 0
                        ? `${Math.max((qualityMid / totalQualitySuppliers) * 100, qualityMid > 0 ? 8 : 0)}%`
                        : '0%',
                      background: 'linear-gradient(180deg, #f59e0b, #d97706)',
                    }}
                  />
                </div>
                <span className="text-xs text-[#a1a1a1]">中等</span>
                <span className="text-xs text-[#666]">50-79分</span>
              </div>

              {/* Low Quality Bar */}
              <div className="flex flex-col items-center gap-2 flex-1 max-w-[160px]">
                <span className="text-sm font-bold text-white">
                  {qualityLow}家
                </span>
                <div className="w-full relative flex items-end justify-center" style={{ height: '140px' }}>
                  <div
                    className="w-full max-w-[80px] rounded-t-lg transition-all duration-700"
                    style={{
                      height: totalQualitySuppliers > 0
                        ? `${Math.max((qualityLow / totalQualitySuppliers) * 100, qualityLow > 0 ? 8 : 0)}%`
                        : '0%',
                      background: 'linear-gradient(180deg, #ef4444, #dc2626)',
                    }}
                  />
                </div>
                <span className="text-xs text-[#a1a1a1]">需关注</span>
                <span className="text-xs text-[#666]">&lt;50分</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-[#262626]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: '#22c55e' }} />
                <span className="text-xs text-[#a1a1a1]">优质 ≥80分</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: '#f59e0b' }} />
                <span className="text-xs text-[#a1a1a1]">中等 50-79分</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ background: '#ef4444' }} />
                <span className="text-xs text-[#a1a1a1]">需关注 &lt;50分</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-[#666] py-4 border-t border-[#1a1a1a]">
        ValueCube Admin · 数据指挥台 · 数据更新时间: {new Date().toLocaleTimeString('zh-CN')}
      </footer>
    </div>
  )
}
