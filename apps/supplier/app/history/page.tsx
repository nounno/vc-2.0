'use client'
import { useState, useEffect } from 'react'
import { FileText, Loader2, ChevronLeft, ChevronRight, X, Tag, Package, TrendingUp, Clock, AlertTriangle } from 'lucide-react'
import { getQuoteHistory, getQuoteDetail, QuoteRecord, QuoteDetail } from '../lib/api'

const tierOptions = [
  { value: '', label: '全部' },
  { value: 'HIGH', label: '高质量' },
  { value: 'MEDIUM', label: '中质量' },
  { value: 'LOW', label: '低质量' },
]

const tierConfig: Record<string, { label: string; className: string }> = {
  HIGH: { label: '高质量', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  MEDIUM: { label: '中质量', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  LOW: { label: '低质量', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatPrice = (price: number | null) => {
  if (price == null) return '—'
  return price.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })
}

export default function HistoryPage() {
  const [tier, setTier] = useState('')
  const [records, setRecords] = useState<QuoteRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<QuoteDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const pageSize = 10

  useEffect(() => {
    fetchHistory()
  }, [tier, page])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const res = await getQuoteHistory(undefined, tier || undefined, page)
      setRecords(res.quotes)
      setTotal(res.total)
    } catch {
      // Handle error silently
    }
    setLoading(false)
  }

  const totalPages = Math.ceil(total / pageSize)

  const openDetail = async (quoteId: number) => {
    setDetailOpen(true)
    setDetail(null)
    setDetailLoading(true)
    try {
      const data = await getQuoteDetail(quoteId)
      setDetail(data)
    } catch {
      setDetail(null)
    }
    setDetailLoading(false)
  }

  const closeDetail = () => {
    setDetailOpen(false)
    setDetail(null)
  }

  const formatRawRow = (rawRow: Record<string, unknown> | null) => {
    if (!rawRow) return '无原始数据'
    try {
      return JSON.stringify(rawRow, null, 2)
    } catch {
      return String(rawRow)
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">报价历史</h1>
        <p className="text-[#a1a1a1]">查看所有已提交的逐条报价记录</p>
      </div>

      {/* Quality Tier Filter */}
      <div className="flex gap-2 mb-6 border-b border-[#262626] pb-4">
        {tierOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setTier(opt.value); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tier === opt.value
                ? 'bg-[#3b82f6] text-white'
                : 'text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border border-[#262626] rounded-xl bg-[#111111] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#3b82f6] animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FileText className="w-12 h-12 text-[#262626] mb-4" />
            <p className="text-[#666]">暂无记录</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#262626]">
                  <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">品牌</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">型号</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">品类</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">价格</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">质量等级</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">置信度</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">提交时间</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const tc = tierConfig[record.quality_tier] || tierConfig.MEDIUM
                  const confidenceColor = record.confidence >= 80 ? 'text-green-400' : record.confidence >= 50 ? 'text-yellow-400' : 'text-red-400'
                  return (
                    <tr key={record.id} className="border-b border-[#262626] hover:bg-[#1f1f1f] transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-white text-sm">{record.brand}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white text-sm font-mono">{record.model_raw}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#a1a1a1] text-sm">{record.category}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white text-sm">{formatPrice(record.price)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${tc.className}`}>
                          {tc.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-mono ${confidenceColor}`}>
                          {record.confidence}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#a1a1a1]">
                        {formatDate(record.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openDetail(record.id)}
                          className="text-sm text-[#3b82f6] hover:underline"
                        >
                          查看详情
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#262626]">
                <span className="text-sm text-[#666]">
                  共 {total} 条记录，第 {page}/{totalPages} 页
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-[#262626] hover:bg-[#1f1f1f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#a1a1a1]" />
                  </button>
                  <span className="text-sm text-[#a1a1a1] px-2">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-[#262626] hover:bg-[#1f1f1f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-[#a1a1a1]" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#111111] border border-[#262626] rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626]">
              <h3 className="text-lg font-semibold text-white">报价详情</h3>
              <button
                onClick={closeDetail}
                className="p-1.5 rounded-lg hover:bg-[#1f1f1f] transition-colors"
              >
                <X className="w-5 h-5 text-[#a1a1a1]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-[#3b82f6] animate-spin" />
                </div>
              ) : detail ? (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-[#0a0a0a]">
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="w-4 h-4 text-[#3b82f6]" />
                        <span className="text-xs text-[#666]">品牌</span>
                      </div>
                      <p className="text-white font-medium">{detail.brand}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[#0a0a0a]">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-[#3b82f6]" />
                        <span className="text-xs text-[#666]">型号</span>
                      </div>
                      <p className="text-white font-medium font-mono">{detail.model_raw}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[#0a0a0a]">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-[#3b82f6]" />
                        <span className="text-xs text-[#666]">品类</span>
                      </div>
                      <p className="text-white font-medium">{detail.category}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[#0a0a0a]">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-[#3b82f6]" />
                        <span className="text-xs text-[#666]">价格</span>
                      </div>
                      <p className="text-white font-medium">{formatPrice(detail.price)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[#0a0a0a]">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-[#3b82f6]" />
                        <span className="text-xs text-[#666]">质量等级</span>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${(tierConfig[detail.quality_tier] || tierConfig.MEDIUM).className}`}>
                        {(tierConfig[detail.quality_tier] || tierConfig.MEDIUM).label}
                      </span>
                    </div>
                    <div className="p-4 rounded-lg bg-[#0a0a0a]">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-[#3b82f6]" />
                        <span className="text-xs text-[#666]">置信度</span>
                      </div>
                      <p className="text-white font-medium">{detail.confidence}%</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[#0a0a0a]">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-[#3b82f6]" />
                        <span className="text-xs text-[#666]">提交时间</span>
                      </div>
                      <p className="text-white font-medium text-sm">{formatDate(detail.created_at)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-[#0a0a0a]">
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="w-4 h-4 text-[#3b82f6]" />
                        <span className="text-xs text-[#666]">供应商</span>
                      </div>
                      <p className="text-white font-medium text-sm">{detail.supplier_name}</p>
                    </div>
                  </div>

                  {/* Error Type */}
                  {detail.error_type && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-xs text-red-400 font-medium">错误原因</span>
                      </div>
                      <p className="text-red-300 text-sm mt-1">{detail.error_type}</p>
                    </div>
                  )}

                  {/* Raw Row JSON */}
                  <div>
                    <h4 className="text-sm font-medium text-[#a1a1a1] mb-2">原始数据 (raw_row)</h4>
                    <pre className="p-4 rounded-lg bg-[#0a0a0a] border border-[#262626] text-xs text-[#a1a1a1] overflow-x-auto whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                      {formatRawRow(detail.raw_row)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <AlertTriangle className="w-12 h-12 text-[#262626] mb-4" />
                  <p className="text-[#666]">无法加载详情</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
