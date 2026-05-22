'use client'
import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Loader2, Edit2, RotateCcw } from 'lucide-react'
import { getQualityFeedback, resubmitRecord } from '../lib/api'

interface FeedbackRecord {
  id: string
  row_number: number
  model: string
  brand: string
  error_type: string
}

export default function FeedbackPage() {
  const [records, setRecords] = useState<FeedbackRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FeedbackRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchFeedback()
  }, [])

  const fetchFeedback = async () => {
    setLoading(true)
    try {
      const res = await getQualityFeedback()
      setRecords(res.records)
    } catch {
      // Handle silently
    }
    setLoading(false)
  }

  const handleEdit = (record: FeedbackRecord) => {
    setEditingId(record.id)
    setEditForm({ ...record })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const handleSaveEdit = async () => {
    if (!editForm) return
    setSubmitting(true)
    try {
      await resubmitRecord(editForm.id, {
        brand: editForm.brand,
        model: editForm.model,
      })
      setSuccessMessage('修正成功！')
      setTimeout(() => setSuccessMessage(null), 3000)
      setEditingId(null)
      setEditForm(null)
      fetchFeedback()
    } catch {
      setSuccessMessage('修正失败，请重试')
    }
    setSubmitting(false)
  }

  const handleResubmit = async (record: FeedbackRecord) => {
    setSubmitting(true)
    try {
      await resubmitRecord(record.id, {
        brand: record.brand,
        model: record.model,
      })
      setSuccessMessage('重新提交成功！')
      setTimeout(() => setSuccessMessage(null), 3000)
      fetchFeedback()
    } catch {
      setSuccessMessage('重新提交失败，请重试')
    }
    setSubmitting(false)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">数据质量反馈</h1>
        <p className="text-[#a1a1a1]">查看被驳回或标记的记录，修正错误后重新提交</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="text-green-500">{successMessage}</span>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#3b82f6] animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="border border-[#262626] rounded-xl bg-[#111111] p-16 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-white font-medium">暂无质量反馈</p>
          <p className="text-[#666] text-sm mt-1">所有报价记录均符合质量标准</p>
        </div>
      ) : (
        <div className="border border-[#262626] rounded-xl bg-[#111111] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#262626]">
                <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">行号</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">品牌</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">型号</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">错误原因</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-[#666]">操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-[#262626] hover:bg-[#1f1f1f] transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-white text-sm font-mono">#{record.row_number}</span>
                  </td>
                  <td className="px-6 py-4">
                    {editingId === record.id ? (
                      <input
                        type="text"
                        value={editForm?.brand || ''}
                        onChange={(e) => setEditForm({ ...editForm!, brand: e.target.value })}
                        className="px-2 py-1 bg-[#0a0a0a] border border-[#262626] rounded text-white text-sm focus:outline-none focus:border-[#3b82f6]"
                      />
                    ) : (
                      <span className="text-white text-sm">{record.brand}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === record.id ? (
                      <input
                        type="text"
                        value={editForm?.model || ''}
                        onChange={(e) => setEditForm({ ...editForm!, model: e.target.value })}
                        className="px-2 py-1 bg-[#0a0a0a] border border-[#262626] rounded text-white text-sm focus:outline-none focus:border-[#3b82f6]"
                      />
                    ) : (
                      <span className="text-white text-sm">{record.model}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                      <AlertCircle className="w-3 h-3" />
                      {record.error_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {editingId === record.id ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            disabled={submitting}
                            className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
                          >
                            {submitting ? '保存中...' : '保存'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1.5 border border-[#262626] hover:bg-[#1f1f1f] text-white text-xs rounded-lg transition-colors"
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(record)}
                            className="flex items-center gap-1 px-3 py-1.5 border border-[#262626] hover:bg-[#1f1f1f] text-white text-xs rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            修正
                          </button>
                          <button
                            onClick={() => handleResubmit(record)}
                            disabled={submitting}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                            {submitting ? '提交中...' : '重新提交'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Help text */}
      {records.length > 0 && (
        <div className="mt-6 p-4 rounded-lg bg-[#111111] border border-[#262626]">
          <p className="text-sm text-[#666]">
            <span className="text-[#a1a1a1]">提示：</span>
            修正错误信息后点击&quot;重新提交&quot;，系统将重新解析该记录并更新质量评估结果。
          </p>
        </div>
      )}
    </div>
  )
}
