'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, Clock, AlertCircle, CheckCircle } from 'lucide-react'

// Types
interface FreshnessSupplier {
  supplier_name: string
  freshness: 'pending' | 'archived'
  updated_at: string
}

interface QualityScore {
  supplier_name: string
  data_quality_score: number
  parse_success_rate: number
  total_records: number
  freshness: 'pending' | 'archived'
  updated_at?: string
}

// Utility function
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

// API Functions
async function fetchFreshness(): Promise<{ suppliers: FreshnessSupplier[] }> {
  const res = await fetch('/api/v1/suppliers/freshness')
  if (!res.ok) throw new Error('数据新鲜度加载失败')
  return res.json()
}

async function fetchQualityScores(): Promise<QualityScore[]> {
  const res = await fetch('/api/v1/suppliers/quality')
  if (!res.ok) return []
  const data = await res.json()
  return data.suppliers || []
}

// Components
function SectionHeader({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-[#3b82f6]" />
      <h2 className="text-lg font-semibold text-white">{title}</h2>
    </div>
  )
}

function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={`bg-[#1a1a1a] rounded-xl border border-[#262626] animate-pulse ${className || 'h-64'}`} />
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

// Main Page Component
export default function SuppliersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [freshnessData, setFreshnessData] = useState<FreshnessSupplier[]>([])
  const [qualityData, setQualityData] = useState<QualityScore[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'archived'>('all')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [freshness, quality] = await Promise.all([
        fetchFreshness(),
        fetchQualityScores().catch(() => [])
      ])

      setFreshnessData(freshness.suppliers || [])
      setQualityData(Array.isArray(quality) ? quality : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Get quality score for a supplier
  const getQualityScore = (supplierName: string): number | null => {
    const found = qualityData.find(
      (q) => q.supplier_name === supplierName || q.supplier_name.includes(supplierName) || supplierName.includes(q.supplier_name)
    )
    return found?.data_quality_score ?? null
  }

  // Filter suppliers
  const filteredSuppliers = freshnessData.filter((supplier) => {
    const matchesSearch = supplier.supplier_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || supplier.freshness === statusFilter
    return matchesSearch && matchesStatus
  })

  // Status badge
  const StatusBadge = ({ status }: { status: 'pending' | 'archived' }) => {
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
          <AlertCircle className="w-3 h-3" />
          待处理
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
        <CheckCircle className="w-3 h-3" />
        已归档
      </span>
    )
  }

  // Handle row click
  const handleRowClick = (supplierName: string) => {
    // Navigate to supplier detail page - find the id from quality data or use encoded name
    const supplier = qualityData.find(
      (q) => q.supplier_name === supplierName || q.supplier_name.includes(supplierName) || supplierName.includes(q.supplier_name)
    )
    const id = supplier?.supplier_name || encodeURIComponent(supplierName)
    router.push(`/suppliers/${encodeURIComponent(id)}`)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">供应商管理</h1>
          <p className="text-sm text-[#a1a1a1] mt-1">数据新鲜度监控 · {new Date().toLocaleDateString('zh-CN')}</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#262626] text-white px-4 py-2 rounded-lg border border-[#262626] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-sm">刷新数据</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
            <input
              type="text"
              placeholder="搜索供应商名称..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#3b82f6]/50"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-[#3b82f6] text-white'
                  : 'bg-[#0a0a0a] text-[#a1a1a1] hover:text-white border border-[#262626]'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-orange-500 text-white'
                  : 'bg-[#0a0a0a] text-[#a1a1a1] hover:text-white border border-[#262626]'
              }`}
            >
              待处理
            </button>
            <button
              onClick={() => setStatusFilter('archived')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'archived'
                  ? 'bg-gray-500 text-white'
                  : 'bg-[#0a0a0a] text-[#a1a1a1] hover:text-white border border-[#262626]'
              }`}
            >
              已归档
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : loading ? (
        <LoadingSkeleton />
      ) : filteredSuppliers.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-8 text-center">
          <AlertCircle className="w-12 h-12 text-[#666] mx-auto mb-3" />
          <p className="text-[#a1a1a1]">暂无供应商数据</p>
          <p className="text-sm text-[#666] mt-1">尝试调整筛选条件</p>
        </div>
      ) : (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#262626]">
                  <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">供应商名称</th>
                  <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">等级</th>
                  <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">状态</th>
                  <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">更新时间</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supplier, idx) => {
                  const qualityScore = getQualityScore(supplier.supplier_name)
                  return (
                    <tr
                      key={supplier.supplier_name + idx}
                      onClick={() => handleRowClick(supplier.supplier_name)}
                      className="border-b border-[#262626] last:border-0 hover:bg-[#1f1f1f] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-white font-medium">{supplier.supplier_name}</span>
                          {qualityScore !== null && (
                            <span className="text-xs text-[#666]">质量分: {qualityScore}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={supplier.freshness} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-sm text-[#a1a1a1]">
                          <Clock className="w-3 h-3" />
                          {calculateTimeAgo(supplier.updated_at)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[#262626]">
            <span className="text-sm text-[#a1a1a1]">
              共 {filteredSuppliers.length} 家供应商
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
