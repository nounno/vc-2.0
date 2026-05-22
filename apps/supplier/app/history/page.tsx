'use client'
import { useState, useEffect } from 'react'
import { FileText, Clock, CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { getQuoteHistory, QuoteRecord } from '../lib/api'

type TabType = 'all' | 'processing' | 'approved' | 'rejected'

const tabs: { key: TabType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'processing', label: '解析中' },
  { key: 'approved', label: '已入库' },
  { key: 'rejected', label: '已驳回' },
]

const statusConfig: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  processing: { label: '解析中', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Loader2 },
  approved: { label: '已入库', className: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  rejected: { label: '已驳回', className: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
  pending: { label: '待处理', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
}

const getStatusInfo = (record: QuoteRecord) => {
  if (record.quality_tier === 'HIGH' || record.quality_tier === 'MEDIUM') {
    return statusConfig.approved
  } else if (record.quality_tier === 'LOW') {
    return statusConfig.rejected
  }
  return statusConfig.processing
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [records, setRecords] = useState<QuoteRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const pageSize = 10

  useEffect(() => {
    fetchHistory()
  }, [activeTab, page])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      let status: string | undefined
      if (activeTab === 'processing') status = 'processing'
      else if (activeTab === 'approved') status = 'approved'
      else if (activeTab === 'rejected') status = 'rejected'

      const res = await getQuoteHistory(undefined, status, page)
      setRecords(res.records)
      setTotal(res.total)
    } catch {
      // Handle error silently for now
    }
    setLoading(false)
  }

  const totalPages = Math.ceil(total / pageSize)

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setPage(1)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">报价历史</h1>
        <p className="text-[#a1a1a1]">查看所有已上传的报价单记录及其处理状态</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#262626] pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-[#3b82f6] text-white'
                : 'text-[#a1a1a1] hover:text-white hover:bg-[#1f1f1f]'
            }`}
          >
            {tab.label}
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
                  <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">文件名</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">提交时间</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">状态</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">记录数</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const statusInfo = getStatusInfo(record)
                  const StatusIcon = statusInfo.icon
                  return (
                    <tr key={record.id} className="border-b border-[#262626] hover:bg-[#1f1f1f] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-[#666]" />
                          <span className="text-white text-sm">{record.file_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#a1a1a1]">
                        {formatDate(record.submitted_at)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusInfo.className}`}>
                          <StatusIcon className={`w-3 h-3 ${record.status === 'processing' ? 'animate-spin' : ''}`} />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#a1a1a1]">
                        {record.record_count}
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-sm text-[#3b82f6] hover:underline">
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
    </div>
  )
}
