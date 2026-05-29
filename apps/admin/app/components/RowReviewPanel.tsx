'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ArrowLeft, CheckCircle, Clock, Loader, X, ChevronRight, Database,
  Edit3, Ban, FileText, Shield, Info
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SheetInfo {
  name: string
  row_count: number
  valid_rows: number
  flagged_rows: number
  rejected_rows: number
  pending_split_rows: number
}

export interface JobDetail {
  id: number
  job_code: string
  supplier_id: number
  original_filename: string
  status: string
  sheet_count: number
  total_rows: number
  valid_rows: number
  flagged_rows: number
  committed_rows: number
  rejected_rows: number
  split_summary: string | null
  cleaning_summary: string | null
  mapping_summary: string | null
  standardization_summary: string | null
  created_at: string
  updated_at: string
  supplier_name?: string
}

export interface RowData {
  id: number
  sheet_name: string
  row_index: number
  row_status: string
  confidence: number
  brand: string
  category: string
  model: string
  model_std: string
  price: number | null
  description: string
  notes: string
  raw_data: string | null
  source_columns: string | null
  confidence_details: string | null
  is_multi_product: number
  manually_corrected: number
  reviewer_action: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const STATUS_ORDER = ['uploaded', 'split', 'cleaned', 'mapped', 'standardized', 'committed']
export const STATUS_LABELS: Record<string, string> = {
  uploaded: '已上传', split: '已分Sheet', cleaned: '已清洗',
  mapped: '已映射', standardized: '已标准化', committed: '已入库', failed: '失败',
}
export const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  uploaded:    { color: 'text-gray-400',   bg: 'bg-gray-500/20'   },
  split:       { color: 'text-blue-400',   bg: 'bg-blue-500/20'   },
  cleaned:     { color: 'text-cyan-400',   bg: 'bg-cyan-500/20'   },
  mapped:      { color: 'text-purple-400', bg: 'bg-purple-500/20' },
  standardized:{ color: 'text-green-400',  bg: 'bg-green-500/20'  },
  committed:   { color: 'text-green-500',  bg: 'bg-green-500/20'  },
  failed:      { color: 'text-red-400',    bg: 'bg-red-500/20'    },
}
export const ROW_STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  valid:         { label: '有效',   color: 'text-green-400', bg: 'bg-green-500/20'  },
  flagged:       { label: '待审',   color: 'text-yellow-400',bg: 'bg-yellow-500/20' },
  rejected:      { label: '已拒绝', color: 'text-red-400',   bg: 'bg-red-500/20'   },
  pending_split: { label: '待拆分', color: 'text-orange-400',bg: 'bg-orange-500/20'},
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function formatDate(s: string) {
  return new Date(s).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatDateFull(s: string) {
  return new Date(s).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function parseSummary(json: string | null): Record<string, unknown> {
  if (!json) return {}
  try { return JSON.parse(json) } catch { return {} }
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  row: RowData
  onClose: () => void
  onSave: (rowId: number, data: Partial<RowData>) => void
}

function EditModal({ row, onClose, onSave }: EditModalProps) {
  const [form, setForm] = useState({
    brand: row.brand || '',
    category: row.category || '',
    model: row.model || '',
    model_std: row.model_std || '',
    price: row.price != null ? String(row.price) : '',
    description: row.description || '',
    notes: row.notes || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      action: 'modify',
      data: {
        brand: form.brand || null,
        category: form.category || null,
        model: form.model || null,
        model_std: form.model_std || null,
        price: form.price ? parseFloat(form.price) : null,
        description: form.description || null,
        notes: form.notes || null,
      }
    }
    try {
      const res = await fetch(`/api/v1/parser/rows/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('保存失败')
      onSave(row.id, { ...row, ...form, price: form.price ? parseFloat(form.price) : null })
      onClose()
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[#262626]">
          <div>
            <h2 className="text-lg font-semibold text-white">修改行数据</h2>
            <p className="text-xs text-[#666] mt-0.5">
              第 {row.row_index} 行 · {row.sheet_name} · 置信度 {row.confidence.toFixed(1)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#262626] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[#666]" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'brand', label: '品牌', example: '如：美的' },
              { key: 'category', label: '品类', example: '如：冰箱' },
              { key: 'model', label: '型号', example: '原始型号' },
              { key: 'model_std', label: '标准型号', example: '标准化后' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-[#999] mb-1.5">{f.label}</label>
                <input
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.example}
                  className="w-full bg-[#0d0d0d] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3b82f6]"
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#999] mb-1.5">价格（元）</label>
              <input
                value={form.price}
                onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                placeholder="如：2999"
                type="number"
                className="w-full bg-[#0d0d0d] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3b82f6]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#999] mb-1.5">功能描述</label>
              <input
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="如：变频节能"
                className="w-full bg-[#0d0d0d] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3b82f6]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#999] mb-1.5">备注</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="备注信息"
              rows={2}
              className="w-full bg-[#0d0d0d] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#3b82f6] resize-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-5 border-t border-[#262626]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#999] hover:text-white transition-colors">取消</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving && <Loader className="w-4 h-4 animate-spin" />}
            保存修改
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── RowReviewPanel ──────────────────────────────────────────────────────────

export interface RowReviewPanelProps {
  jobId: number
  onBack: () => void
}

export default function RowReviewPanel({ jobId, onBack }: RowReviewPanelProps) {
  const [job, setJob] = useState<JobDetail | null>(null)
  const [sheets, setSheets] = useState<SheetInfo[]>([])
  const [rows, setRows] = useState<RowData[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRows, setLoadingRows] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [committing, setCommitting] = useState(false)
  const [checkingConsistency, setCheckingConsistency] = useState(false)
  const [consistencyResult, setConsistencyResult] = useState<string | null>(null)

  const [activeSheet, setActiveSheet] = useState<string>('')
  const [activeStatus, setActiveStatus] = useState<string>('flagged')
  const [page, setPage] = useState(1)
  const [totalRowsCount, setTotalRowsCount] = useState(0)
  const pageSize = 30

  const [editRow, setEditRow] = useState<RowData | null>(null)

  // ─── Fetch job detail ─────────────────────────────────────────────────────

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/parser/jobs/${jobId}`)
      if (!res.ok) throw new Error(`加载失败 (${res.status})`)
      const data = await res.json()
      setJob(data)
      const summary = parseSummary(data.split_summary)
      if (Array.isArray(summary) && summary.length > 0 && !activeSheet) {
        setActiveSheet(data.sheet_count === 1 ? summary[0].name || '' : '')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [jobId])

  // ─── Fetch sheets ─────────────────────────────────────────────────────────

  const fetchSheets = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/parser/jobs/${jobId}/sheets`)
      if (!res.ok) return
      const data = await res.json()
      setSheets(data.sheets || [])
      if (data.sheets?.length > 0 && !activeSheet) {
        setActiveSheet(data.sheets[0].name)
      }
    } catch { /* ignore */ }
  }, [jobId])

  // ─── Fetch rows ───────────────────────────────────────────────────────────

  const fetchRows = useCallback(async (pg = 1) => {
    setLoadingRows(true)
    try {
      const params = new URLSearchParams({
        page: String(pg), limit: String(pageSize), status: activeStatus,
      })
      if (activeSheet) params.set('sheet', activeSheet)
      const res = await fetch(`/api/v1/parser/jobs/${jobId}/rows?${params}`)
      if (!res.ok) throw new Error(`加载行数据失败 (${res.status})`)
      const data = await res.json()
      setRows(data.rows || [])
      setTotalRowsCount(data.total || 0)
      setPage(pg)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingRows(false)
    }
  }, [jobId, activeSheet, activeStatus])

  // ─── Init ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!jobId) return
    setLoading(true)
    Promise.all([fetchJob(), fetchSheets()]).finally(() => setLoading(false))
  }, [jobId])

  useEffect(() => {
    if (!job) return
    fetchRows(1)
  }, [job, activeSheet, activeStatus])

  // ─── Commit ────────────────────────────────────────────────────────────────

  const handleCommit = async (action: 'commit_all' | 'commit_valid') => {
    if (!confirm(action === 'commit_all' ? '确认入库所有未拒绝的行？' : '确认只入库有效行？')) return
    setCommitting(true)
    try {
      const res = await fetch(`/api/v1/parser/jobs/${jobId}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || '入库失败')
      alert(`成功入库 ${data.committed} 条`)
      fetchJob()
      fetchRows(page)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '入库失败')
    } finally {
      setCommitting(false)
    }
  }

  // ─── LLM consistency check ────────────────────────────────────────────────

  const handleCheckConsistency = async () => {
    if (!confirm('启动 LLM 一致性检查？这将更新所有行的置信度评分。')) return
    setCheckingConsistency(true)
    setConsistencyResult('排队中...')
    try {
      const res = await fetch(`/api/v1/parser/jobs/${jobId}/check-consistency`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || '检查失败')

      // Poll for completion
      let pollCount = 0
      const poll = async () => {
        try {
          const statusRes = await fetch(`/api/v1/parser/jobs/${jobId}/consistency-status`)
          const status = await statusRes.json()
          if (status.status === 'done') {
            setConsistencyResult(status.message || '一致性检查完成')
            setCheckingConsistency(false)
            fetchJob()
            fetchRows(page)
          } else if (status.status === 'error') {
            throw new Error(status.message || '检查失败')
          } else if (pollCount < 120) {
            // Still running, poll again in 5 seconds
            pollCount++
            setConsistencyResult(`检查中... (${pollCount * 5}秒)`)
            setTimeout(poll, 5000)
          } else {
            throw new Error('检查超时')
          }
        } catch (e: unknown) {
          throw e
        }
      }
      setTimeout(poll, 3000)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'LLM 检查失败')
      setCheckingConsistency(false)
      setConsistencyResult(null)
    }
  }

  // ─── Row actions ───────────────────────────────────────────────────────────

  const handleReject = async (rowId: number) => {
    if (!confirm('确认拒绝该行？')) return
    try {
      const res = await fetch(`/api/v1/parser/rows/${rowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      })
      if (!res.ok) throw new Error('拒绝失败')
      setRows(prev => prev.filter(r => r.id !== rowId))
      setTotalRowsCount(prev => prev - 1)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '操作失败')
    }
  }

  const handleRowSave = (rowId: number, updated: Partial<RowData>) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, ...updated } : r))
    setEditRow(null)
  }

  const currentStageIdx = job ? STATUS_ORDER.indexOf(job.status) : -1
  const totalPages = Math.ceil(totalRowsCount / pageSize)

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-[#3b82f6] animate-spin" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {error || '任务不存在'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1f1f1f] shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="p-2 hover:bg-[#1f1f1f] rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#666]" />
          </button>
          <div className="flex items-center gap-2 text-sm text-[#666]">
            <span>解析任务</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white">{job.original_filename}</span>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg font-bold text-white">{job.original_filename}</h1>
              {(() => {
                const s = STATUS_STYLE[job.status] || STATUS_STYLE.failed
                return (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.color}`}>
                    {STATUS_LABELS[job.status] || job.status}
                  </span>
                )
              })()}
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-[#666]">
              <span>任务码 {job.job_code}</span>
              <span>·</span>
              <span>供应商 {job.supplier_name || job.supplier_id}</span>
              <span>·</span>
              <span>{formatDateFull(job.created_at)}</span>
            </div>
          </div>

          {job.status !== 'committed' && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCheckConsistency}
                disabled={checkingConsistency}
                className="flex items-center gap-2 bg-purple-600/80 hover:bg-purple-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                title="调用 DeepSeek 检查每行解析结果与原始数据是否一致"
              >
                {checkingConsistency ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                {checkingConsistency ? '检查中...' : 'LLM 一致性'}
              </button>
              <span className="text-[#2a2a2a]">|</span>
              <button
                onClick={() => handleCommit('commit_valid')}
                disabled={committing || job.valid_rows === 0}
                className="flex items-center gap-2 bg-green-600/80 hover:bg-green-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                {committing ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                入库有效行 ({job.valid_rows})
              </button>
              <button
                onClick={() => handleCommit('commit_all')}
                disabled={committing || (job.valid_rows + job.flagged_rows) === 0}
                className="flex items-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                {committing ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                入库全部
              </button>
            </div>
          )}
        </div>

        {/* Stage pipeline */}
        <div className="flex items-center gap-0 mt-4">
          {STATUS_ORDER.map((stage, idx) => {
            const isDone = idx < currentStageIdx
            const isCurrent = idx === currentStageIdx
            return (
              <div key={stage} className="flex items-center">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  isDone ? 'bg-green-500/20 text-green-400' :
                  isCurrent ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' :
                  'bg-[#1f1f1f] text-[#555]'
                }`}>
                  {isDone ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {STATUS_LABELS[stage]}
                </div>
                {idx < STATUS_ORDER.length - 1 && (
                  <div className={`w-6 h-px ${isDone ? 'bg-green-500/40' : 'bg-[#2a2a2a]'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-5 py-3 grid grid-cols-5 gap-3 border-b border-[#1f1f1f] shrink-0">
        {[
          { label: '总行数', value: job.total_rows, color: 'text-white' },
          { label: '有效', value: job.valid_rows, color: 'text-green-400' },
          { label: '待审', value: job.flagged_rows, color: 'text-yellow-400' },
          { label: '已拒绝', value: job.rejected_rows, color: 'text-red-400' },
          { label: '已入库', value: job.committed_rows, color: 'text-blue-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#141414] rounded-lg p-2">
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-[#666] mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {consistencyResult && (
        <div className="px-5 py-2 bg-purple-900/20 border-b border-purple-800/30 shrink-0">
          <div className="flex items-center gap-2 text-xs text-purple-300">
            <Shield className="w-3.5 h-3.5" />
            {consistencyResult}
          </div>
        </div>
      )}

      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className="px-5 pt-3 flex items-center gap-1 border-b border-[#1f1f1f] shrink-0">
          {sheets.map(sheet => (
            <button
              key={sheet.name}
              onClick={() => { setActiveSheet(sheet.name); setPage(1) }}
              className={`px-3 py-1.5 text-xs rounded-t-lg border-b-2 transition-colors ${
                activeSheet === sheet.name
                  ? 'border-[#3b82f6] text-white bg-[#1a1a1a]'
                  : 'border-transparent text-[#666] hover:text-white hover:bg-[#111]'
              }`}
            >
              {sheet.name}
              <span className="ml-1.5 text-[10px] text-[#555]">{sheet.valid_rows}V / {sheet.flagged_rows}F</span>
            </button>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="px-5 pt-3 pb-2 flex items-center gap-2 shrink-0">
        {Object.entries(ROW_STATUS_STYLE).map(([key, cfg]) => {
          const count = key === 'valid' ? job.valid_rows
            : key === 'flagged' ? job.flagged_rows
            : key === 'rejected' ? job.rejected_rows
            : 0
          return (
            <button
              key={key}
              onClick={() => { setActiveStatus(key); setPage(1) }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeStatus === key
                  ? `${cfg.bg} ${cfg.color}`
                  : 'bg-[#1a1a1a] text-[#666] hover:text-white'
              }`}
            >
              {cfg.label}
              <span className={activeStatus === key ? '' : 'text-[#444]'}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Row table */}
      <div className="flex-1 overflow-auto px-5 pb-5">
        {loadingRows ? (
          <div className="flex items-center justify-center h-40">
            <Loader className="w-6 h-6 text-[#3b82f6] animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-[#141414] rounded-xl p-10 text-center text-[#555] text-sm">
            暂无数据
          </div>
        ) : (
          <>
            <div className="bg-[#141414] rounded-xl border border-[#1f1f1f] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#141414] z-10">
                  <tr className="border-b border-[#1f1f1f]">
                    <th className="text-left px-3 py-2.5 text-xs text-[#666] font-medium">#</th>
                    <th className="text-left px-3 py-2.5 text-xs text-[#666] font-medium">状态</th>
                    <th className="text-left px-3 py-2.5 text-xs text-[#666] font-medium">品牌</th>
                    <th className="text-left px-3 py-2.5 text-xs text-[#666] font-medium">品类</th>
                    <th className="text-left px-3 py-2.5 text-xs text-[#666] font-medium">型号</th>
                    <th className="text-right px-3 py-2.5 text-xs text-[#666] font-medium">价格</th>
                    <th className="text-left px-3 py-2.5 text-xs text-[#666] font-medium">功能描述</th>
                    <th className="text-left px-3 py-2.5 text-xs text-[#666] font-medium">备注</th>
                    <th className="text-right px-3 py-2.5 text-xs text-[#666] font-medium">置信度</th>
                    <th className="text-center px-3 py-2.5 text-xs text-[#666] font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const s = ROW_STATUS_STYLE[row.row_status] || ROW_STATUS_STYLE.flagged
                    return (
                      <tr key={row.id} className="border-t border-[#1a1a1a] hover:bg-[#1a1a1a]/50 transition-colors">
                        <td className="px-3 py-2.5 text-[#555] text-xs">{row.row_index}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${s.bg} ${s.color}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-white font-medium">{row.brand || <span className="text-[#444]">—</span>}</td>
                        <td className="px-3 py-2.5 text-[#ccc]">{row.category || <span className="text-[#444]">—</span>}</td>
                        <td className="px-3 py-2.5 text-[#ccc] font-mono text-xs">
                          {row.model_std || row.model || <span className="text-[#444]">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right text-green-400 font-medium">
                          {row.price != null ? `¥${Number(row.price).toLocaleString()}` : <span className="text-[#444]">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-[#999] text-xs max-w-[160px] truncate">{row.description || <span className="text-[#444]">—</span>}</td>
                        <td className="px-3 py-2.5 text-[#666] text-xs max-w-[120px] truncate">{row.notes || <span className="text-[#444]">—</span>}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`inline-flex items-center gap-1 text-xs font-mono ${
                            row.confidence >= 80 ? 'text-green-400' :
                            row.confidence >= 60 ? 'text-yellow-400' :
                            row.confidence > 0 ? 'text-orange-400' : 'text-red-400'
                          }`}>
                            {row.confidence.toFixed(1)}
                            {row.confidence_details && (() => {
                              try {
                                const details = JSON.parse(row.confidence_details)
                                if (details.reason && details.method === 'llm_consistency') {
                                  return (
                                    <span className="group relative inline-flex">
                                      <Info className="w-3 h-3 opacity-50 group-hover:opacity-100 cursor-help" />
                                      <span className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-[#1a1a1a] text-[#ccc] text-[10px] px-2 py-1 rounded border border-[#333] whitespace-nowrap z-50 shadow-lg">
                                        {details.reason}
                                      </span>
                                    </span>
                                  )
                                }
                              } catch {}
                              return null
                            })()}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setEditRow(row)} className="p-1 hover:bg-[#262626] rounded transition-colors" title="修改">
                              <Edit3 className="w-3.5 h-3.5 text-[#666] hover:text-white" />
                            </button>
                            <button onClick={() => handleReject(row.id)} className="p-1 hover:bg-[#262626] rounded transition-colors" title="拒绝">
                              <Ban className="w-3.5 h-3.5 text-[#666] hover:text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => fetchRows(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-xs bg-[#1a1a1a] hover:bg-[#262626] text-white disabled:opacity-30 rounded-lg transition-colors"
                >
                  上一页
                </button>
                <span className="text-xs text-[#666] px-2">
                  第 {page} / {totalPages} 页，共 {totalRowsCount} 条
                </span>
                <button
                  onClick={() => fetchRows(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-xs bg-[#1a1a1a] hover:bg-[#262626] text-white disabled:opacity-30 rounded-lg transition-colors"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {editRow && (
        <EditModal row={editRow} onClose={() => setEditRow(null)} onSave={handleRowSave} />
      )}
    </div>
  )
}
