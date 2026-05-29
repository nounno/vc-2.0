'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Upload, FileText, RefreshCw, ChevronRight, X, Loader, Plus, Download } from 'lucide-react'
import RowReviewPanel from '../components/RowReviewPanel'

interface Supplier {
  id: number
  supplier_name: string
  supplier_code: string
}

interface ParserJob {
  id: number
  job_code: string
  supplier_id: number
  original_filename: string
  status: 'pending' | 'parsing' | 'parsed' | 'standardized' | 'committed' | 'failed'
  sheet_count: number
  total_rows: number
  valid_rows: number
  flagged_rows: number
  committed_rows: number
  rejected_rows: number
  created_at: string
  updated_at: string
  supplier_name?: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: '等待中',   color: 'text-gray-400',   bg: 'bg-gray-500/20'   },
  parsing:     { label: '解析中',   color: 'text-blue-400',   bg: 'bg-blue-500/20'   },
  parsed:      { label: '已解析',   color: 'text-blue-400',   bg: 'bg-blue-500/20'   },
  standardized:{ label: '已标准化', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  committed:   { label: '已入库',   color: 'text-green-400',  bg: 'bg-green-500/20'  },
  failed:      { label: '失败',     color: 'text-red-400',    bg: 'bg-red-500/20'    },
}

function formatDate(s: string) {
  return new Date(s).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function ParserPage() {
  const [jobs, setJobs] = useState<ParserJob[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Selected job for right panel
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)

  // Supplier state
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [creatingSupplier, setCreatingSupplier] = useState(false)

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/suppliers')
      if (res.ok) {
        const data = await res.json()
        setSuppliers(data.suppliers || [])
      }
    } catch (e) {
      console.error('Failed to fetch suppliers:', e)
    }
  }, [])

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])

  const createSupplier = async () => {
    if (!newSupplierName.trim()) return
    setCreatingSupplier(true)
    try {
      const res = await fetch('/api/v1/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier_name: newSupplierName.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        await fetchSuppliers()
        setSelectedSupplierId(data.id)
        setShowSupplierModal(false)
        setNewSupplierName('')
      }
    } catch (e) {
      console.error('Failed to create supplier:', e)
    } finally {
      setCreatingSupplier(false)
    }
  }

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/parser/jobs')
      if (!res.ok) throw new Error(`加载失败 (${res.status})`)
      const data = await res.json()
      setJobs(data.jobs || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const handleFile = async (file: File) => {
    if (!selectedSupplierId) {
      setError('请先选择供应商')
      return
    }
    setUploading(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('supplier_id', String(selectedSupplierId))
    try {
      const res = await fetch('/api/v1/parser/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { detail?: string }).detail || `上传失败 (${res.status})`)
      }
      await fetchJobs()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleSelectJob = (jobId: number) => {
    setSelectedJobId(prev => prev === jobId ? null : jobId)
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* ─── Left Column: Job List ─────────────────────────────────────── */}
      <div className={`flex flex-col transition-all duration-300 ${selectedJobId ? 'w-[380px] min-w-[320px]' : 'w-full'}`}>
        {/* Header */}
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-[#1f1f1f]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">解析任务</h1>
              <p className="text-xs text-[#a1a1a1] mt-0.5">上传 Excel，自动识别品牌/型号/价格</p>
            </div>
            <button onClick={fetchJobs} disabled={loading}
              className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#262626] text-white px-3 py-1.5 rounded-lg border border-[#262626] transition-colors disabled:opacity-50 text-sm">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-sm">刷新</span>
            </button>
          </div>
        </div>

        {/* Supplier Selector */}
        <div className="shrink-0 px-4 py-3 flex items-center gap-2 border-b border-[#1f1f1f]">
          <select
            value={selectedSupplierId ?? ''}
            onChange={e => setSelectedSupplierId(e.target.value ? Number(e.target.value) : null)}
            className="bg-[#1a1a1a] text-white border border-[#333] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#3b82f6] flex-1"
          >
            <option value="">请选择供应商</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.supplier_name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowSupplierModal(true)}
            className="flex items-center gap-1 bg-[#1a1a1a] hover:bg-[#262626] text-white px-2.5 py-1.5 rounded-lg border border-[#333] text-sm transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            新建
          </button>
        </div>

        {/* Upload Zone */}
        <div
          className={`shrink-0 mx-4 mt-3 border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer
            ${dragOver ? 'border-[#3b82f6] bg-[#3b82f6]/5' : 'border-[#333] hover:border-[#555]'}
            ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileInput} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader className="w-7 h-7 text-[#3b82f6] animate-spin" />
              <p className="text-[#a1a1a1] text-xs">正在解析…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#1f1f1f] flex items-center justify-center">
                <Upload className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <p className="text-white text-sm font-medium">拖拽 Excel 或<span className="text-[#3b82f6]">点击选择</span></p>
              <p className="text-[10px] text-[#666]">.xlsx / .xls，最大 50MB</p>
            </div>
          )}
        </div>

        {error && (
          <div className="shrink-0 mx-4 mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <span className="text-red-400 text-xs flex-1">{error}</span>
            <button onClick={() => setError(null)}><X className="w-3.5 h-3.5 text-red-400/60 hover:text-red-400" /></button>
          </div>
        )}

        {/* Job List */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#3b82f6]" />
            解析任务 ({jobs.length})
          </h2>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-[#1a1a1a] rounded-xl border border-[#262626] animate-pulse" />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-8 text-center text-[#666] text-sm">
              暂无解析任务
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map(job => {
                const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending
                const isSelected = selectedJobId === job.id
                return (
                  <button
                    key={job.id}
                    onClick={() => handleSelectJob(job.id)}
                    className={`w-full flex items-center gap-3 rounded-xl p-3 transition-all text-left ${
                      isSelected
                        ? 'bg-[#1f2937] border border-[#3b82f6]/40 shadow-lg'
                        : 'bg-[#1a1a1a] border border-[#262626] hover:bg-[#1f1f1f] hover:border-[#333]'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#1f1f1f] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-[#a1a1a1]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium truncate">{job.original_filename}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-[#666]">
                        <span>{job.job_code}</span>
                        <span>行: {job.total_rows}</span>
                        {job.valid_rows > 0 && <span className="text-green-400">✓ {job.valid_rows}</span>}
                        {job.flagged_rows > 0 && <span className="text-yellow-400">⚠ {job.flagged_rows}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const a = document.createElement('a')
                          a.href = `/api/v1/parser/jobs/${job.id}/export`
                          a.download = ''
                          a.click()
                        }}
                        className="p-1.5 rounded-lg hover:bg-[#262626] text-[#555] hover:text-[#3b82f6] transition-colors"
                        title="下载 Excel"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'rotate-90 text-[#3b82f6]' : 'text-[#555]'}`} />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Right Column: Row Review Panel ────────────────────────────── */}
      {selectedJobId ? (
        <div className="flex-1 border-l border-[#1f1f1f] overflow-hidden">
          <RowReviewPanel jobId={selectedJobId} onBack={() => setSelectedJobId(null)} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-[#262626] flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-[#333]" />
          </div>
          <h3 className="text-white text-lg font-medium mb-2">请选择一个解析任务</h3>
          <p className="text-[#666] text-sm">从左侧列表选择一个任务，可查看和审批行数据</p>
        </div>
      )}

      {/* New Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowSupplierModal(false)}>
          <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 w-96" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">新建供应商</h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-[#666] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={newSupplierName}
              onChange={e => setNewSupplierName(e.target.value)}
              placeholder="请输入供应商名称"
              className="w-full bg-[#0a0a0a] text-white border border-[#333] rounded-lg px-4 py-2 text-sm mb-4 focus:outline-none focus:border-[#3b82f6]"
              onKeyDown={e => e.key === 'Enter' && createSupplier()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSupplierModal(false)}
                className="px-4 py-2 text-sm text-[#a1a1a1] hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={createSupplier}
                disabled={creatingSupplier || !newSupplierName.trim()}
                className="flex items-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 transition-colors"
              >
                {creatingSupplier && <Loader className="w-4 h-4 animate-spin" />}
                确定创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
