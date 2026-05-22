'use client'
import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { uploadQuoteFile, getTaskResult } from './lib/api'

type UploadStatus = 'idle' | 'uploading' | 'polling' | 'done' | 'error'

interface UploadResult {
  high_count: number
  medium_count: number
  low_count: number
}

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Manual form fallback
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualForm, setManualForm] = useState({
    brand: '',
    model: '',
    category: '',
    price: '',
    quantity: '',
  })
  const [formSubmitting, setFormSubmitting] = useState(false)

  const handleDrag = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (isValidFile(droppedFile)) {
        setFile(droppedFile)
        setError(null)
      } else {
        setError('请上传 xlsx 或 csv 格式的文件')
      }
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (isValidFile(selectedFile)) {
        setFile(selectedFile)
        setError(null)
      } else {
        setError('请上传 xlsx 或 csv 格式的文件')
      }
    }
  }

  const isValidFile = (file: File): boolean => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    return ext === 'xlsx' || ext === 'csv'
  }

  const handleUpload = async () => {
    if (!file) return

    setStatus('uploading')
    setError(null)

    try {
      const res = await uploadQuoteFile(file)
      setTaskId(res.task_id)
      setStatus('polling')
      pollForResult(res.task_id)
    } catch (err) {
      setStatus('error')
      setError('文件上传失败，请重试')
    }
  }

  const pollForResult = async (id: string) => {
    const poll = async () => {
      try {
        const res = await getTaskResult(id)
        if (res.status === 'completed' && res.result) {
          setResult({
            high_count: res.result.high_count || 0,
            medium_count: res.result.medium_count || 0,
            low_count: res.result.low_count || 0,
          })
          setStatus('done')
        } else if (res.status === 'failed') {
          setStatus('error')
          setError('文件解析失败')
        } else {
          // Still polling
          setTimeout(poll, 2000)
        }
      } catch {
        setStatus('error')
        setError('获取结果失败')
      }
    }
    poll()
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitting(true)
    // Create a mock file-like submission
    try {
      const formData = new FormData()
      Object.entries(manualForm).forEach(([key, value]) => {
        formData.append(key, value)
      })
      // For now, just simulate success
      await new Promise((r) => setTimeout(r, 1000))
      setManualForm({ brand: '', model: '', category: '', price: '', quantity: '' })
      alert('手动提交成功！')
    } catch {
      setError('手动提交失败')
    }
    setFormSubmitting(false)
  }

  const resetUpload = () => {
    setFile(null)
    setTaskId(null)
    setStatus('idle')
    setResult(null)
    setError(null)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">报价单上传</h1>
        <p className="text-[#a1a1a1]">上传 Excel 或 CSV 格式的报价单文件，系统将自动解析并入库</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Zone */}
        <div className="border border-[#262626] rounded-xl bg-[#111111] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">文件上传</h2>

          {!file ? (
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                dragActive
                  ? 'border-[#3b82f6] bg-[#3b82f6]/10'
                  : 'border-[#262626] hover:border-[#3b82f6]/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#1f1f1f] flex items-center justify-center">
                  <Upload className="w-8 h-8 text-[#3b82f6]" />
                </div>
                <div>
                  <p className="text-white font-medium">拖拽文件到此处</p>
                  <p className="text-[#666] text-sm mt-1">或点击下方按钮选择文件</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors"
                >
                  选择文件
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={handleChange}
                />
              </div>
            </div>
          ) : (
            <div className="border border-[#262626] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#1f1f1f] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#3b82f6]" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{file.name}</p>
                  <p className="text-[#666] text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button
                onClick={resetUpload}
                className="p-2 hover:bg-[#1f1f1f] rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-[#666]" />
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          {file && status === 'idle' && (
            <button
              onClick={handleUpload}
              className="mt-4 w-full py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg font-medium transition-colors"
            >
              开始上传
            </button>
          )}

          {status === 'uploading' && (
            <div className="mt-4 flex items-center justify-center gap-3 py-3">
              <Loader2 className="w-5 h-5 text-[#3b82f6] animate-spin" />
              <span className="text-[#a1a1a1]">上传中...</span>
            </div>
          )}

          {status === 'polling' && taskId && (
            <div className="mt-4 p-4 rounded-lg bg-[#1f1f1f] border border-[#262626]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#a1a1a1] text-sm">任务ID</span>
                <span className="text-white text-sm font-mono">{taskId}</span>
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-[#3b82f6] animate-spin" />
                <span className="text-[#a1a1a1] text-sm">轮询中...</span>
              </div>
            </div>
          )}

          {status === 'done' && result && (
            <div className="mt-4 p-4 rounded-lg bg-[#1f1f1f] border border-[#262626]">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-white font-medium">解析完成</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-[#0a0a0a]">
                  <p className="text-2xl font-bold text-green-500">{result.high_count}</p>
                  <p className="text-xs text-[#666]">高质量</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-[#0a0a0a]">
                  <p className="text-2xl font-bold text-yellow-500">{result.medium_count}</p>
                  <p className="text-xs text-[#666]">中质量</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-[#0a0a0a]">
                  <p className="text-2xl font-bold text-red-500">{result.low_count}</p>
                  <p className="text-xs text-[#666]">低质量</p>
                </div>
              </div>
              <button
                onClick={resetUpload}
                className="mt-4 w-full py-2 border border-[#262626] hover:bg-[#1f1f1f] text-white rounded-lg text-sm transition-colors"
              >
                继续上传
              </button>
            </div>
          )}

          {/* File type hint */}
          <div className="mt-4 flex items-center gap-2 text-xs text-[#666]">
            <FileText className="w-3 h-3" />
            <span>支持 .xlsx 和 .csv 格式</span>
          </div>
        </div>

        {/* Manual Form Fallback */}
        <div className="border border-[#262626] rounded-xl bg-[#111111] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">手动录入</h2>
            <button
              onClick={() => setShowManualForm(!showManualForm)}
              className="text-sm text-[#3b82f6] hover:underline"
            >
              {showManualForm ? '收起' : '展开'}
            </button>
          </div>

          {showManualForm && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#666] mb-1">品牌</label>
                  <input
                    type="text"
                    value={manualForm.brand}
                    onChange={(e) => setManualForm({ ...manualForm, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white text-sm focus:outline-none focus:border-[#3b82f6]"
                    placeholder="例如：华为"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#666] mb-1">型号</label>
                  <input
                    type="text"
                    value={manualForm.model}
                    onChange={(e) => setManualForm({ ...manualForm, model: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white text-sm focus:outline-none focus:border-[#3b82f6]"
                    placeholder="例如：Mate 60"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#666] mb-1">品类</label>
                <input
                  type="text"
                  value={manualForm.category}
                  onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white text-sm focus:outline-none focus:border-[#3b82f6]"
                  placeholder="例如：手机"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#666] mb-1">价格</label>
                  <input
                    type="number"
                    value={manualForm.price}
                    onChange={(e) => setManualForm({ ...manualForm, price: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white text-sm focus:outline-none focus:border-[#3b82f6]"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#666] mb-1">数量</label>
                  <input
                    type="number"
                    value={manualForm.quantity}
                    onChange={(e) => setManualForm({ ...manualForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-white text-sm focus:outline-none focus:border-[#3b82f6]"
                    placeholder="1"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full py-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {formSubmitting ? '提交中...' : '提交'}
              </button>
            </form>
          )}

          {!showManualForm && (
            <p className="text-[#666] text-sm">
              如果文件上传失败，您可以手动录入报价信息。
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
