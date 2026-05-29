'use client'
import { useState, useEffect } from 'react'
import { Loader2, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react'
import { getQuoteHistory, QuoteRecord } from '../lib/api'

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
  if (price === null || price === undefined) return '—'
  return price.toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })
}

export default function FeedbackPage() {
  const [records, setRecords] = useState<QuoteRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const pageSize = 10

  useEffect(() => {
    fetchFeedback()
  }, [page])

  const fetchFeedback = async () => {
    setLoading(true)
    try {
      const res = await getQuoteHistory(undefined, 'LOW', page)
      setRecords(res.quotes)
      setTotal(res.total)
    } catch {
      // Handle silently
    }
    setLoading(false)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">质量反馈</h1>
        <p className="text-[#a1a1a1]">查看被标记为低质量的报价记录及其错误原因</p>
      </div>

      {/* Table */}
      <div className="border border-[#262626] rounded-xl bg-[#111111] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#3b82f6] animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
            <p className="text-white font-medium">暂无低质量记录</p>
            <p className="text-[#666] text-sm mt-1">所有报价记录均符合质量标准</p>
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
                  <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">错误原因</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">提交时间</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const tc = tierConfig[record.quality_tier] || tierConfig.LOW
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
                        <span className="text-sm font-mono text-red-400">
                          {record.confidence}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {record.error_type ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            {record.error_type}
                          </span>
                        ) : (
                          <span className="text-[#666] text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#a1a1a1]">
                        {formatDate(record.created_at)}
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

      {/* Help text */}
      {records.length > 0 && (
        <div className="mt-6 p-4 rounded-lg bg-[#111111] border border-[#262626]">
          <p className="text-sm text-[#666]">
            <span className="text-[#a1a1a1]">提示：</span>
            以上为系统自动标记的低质量报价记录。如需修正数据，请重新上传报价文件。
          </p>
        </div>
      )}
    </div>
  )
}
