'use client'
import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

type TabType = 'quote' | 'product'
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

interface UploadResult {
  filename: string
  type: string
  records_parsed: number
  records_inserted: number
  errors: { row: number; error: string }[]
}

export default function UploadPage() {
  const [activeTab, setActiveTab] = useState<TabType>('quote')
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [result, setResult] = useState<UploadResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0]
      if (validateFile(f)) setFile(f)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0]
      if (validateFile(f)) setFile(f)
    }
  }

  const validateFile = (f: File): boolean => {
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase()
    if (!['.xlsx', '.csv'].includes(ext)) {
      setErrorMsg('仅支持 .xlsx 和 .csv 文件')
      return false
    }
    if (f.size > 50 * 1024 * 1024) {
      setErrorMsg('文件大小不能超过 50MB')
      return false
    }
    setErrorMsg('')
    return true
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleUpload = async () => {
    if (!file) return
    setStatus('uploading')
    setResult(null)
    setErrorMsg('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', activeTab)

    try {
      const res = await fetch('/api/v1/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.detail || '上传失败')
        setStatus('error')
      } else {
        setResult(data)
        setStatus('success')
      }
    } catch (err) {
      setErrorMsg('网络错误，请重试')
      setStatus('error')
    }
  }

  const resetUpload = () => {
    setFile(null)
    setStatus('idle')
    setResult(null)
    setErrorMsg('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">数据上传</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#1a1a1a] p-1 rounded-lg w-fit">
          <button
            onClick={() => { setActiveTab('quote'); resetUpload(); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'quote'
                ? 'bg-[#3b82f6] text-white'
                : 'text-[#a1a1a1] hover:text-white'
            }`}
          >
            供应商报价
          </button>
          <button
            onClick={() => { setActiveTab('product'); resetUpload(); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'product'
                ? 'bg-[#3b82f6] text-white'
                : 'text-[#a1a1a1] hover:text-white'
            }`}
          >
            商品数据
          </button>
        </div>

        {/* Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-[#3b82f6] bg-[#3b82f6]/10'
              : 'border-[#262626] hover:border-[#404040] hover:bg-[#1a1a1a]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-[#3b82f6]" />
              <div className="text-left">
                <div className="text-white font-medium">{file.name}</div>
                <div className="text-[#888] text-sm">{formatFileSize(file.size)}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); resetUpload(); }}
                className="ml-4 p-1 rounded-full hover:bg-[#262626]"
              >
                <X className="w-5 h-5 text-[#666]" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 mx-auto mb-4 text-[#666]" />
              <p className="text-[#a1a1a1] mb-1">拖拽文件到此处，或点击选择</p>
              <p className="text-[#666] text-sm">支持 .xlsx、.csv 文件，最大 50MB</p>
            </>
          )}
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span className="text-red-400 text-sm">{errorMsg}</span>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!file || status === 'uploading'}
          className={`mt-6 w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            !file || status === 'uploading'
              ? 'bg-[#262626] text-[#666] cursor-not-allowed'
              : 'bg-[#3b82f6] text-white hover:bg-[#2563eb]'
          }`}
        >
          {status === 'uploading' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              上传中...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              开始上传
            </>
          )}
        </button>

        {/* Result Cards */}
        {result && status === 'success' && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              <div>
                <div className="text-green-400 font-medium">上传成功</div>
                <div className="text-[#a1a1a1] text-sm mt-1">
                  已解析 {result.records_parsed} 条记录，插入 {result.records_inserted} 条
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="text-yellow-400 text-sm font-medium mb-2">部分记录存在错误</div>
                {result.errors.slice(0, 5).map((err, i) => (
                  <div key={i} className="text-[#a1a1a1] text-xs">
                    行 {err.row}: {err.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Template Hint */}
        <div className="mt-8 p-4 bg-[#1a1a1a] border border-[#262626] rounded-lg">
          <h3 className="text-white font-medium mb-2">数据格式要求</h3>
          {activeTab === 'quote' ? (
            <div className="text-[#a1a1a1] text-sm space-y-1">
              <p>供应商报价需包含以下列：</p>
              <code className="block text-[#3b82f6] mt-2">supplier_name, brand, category, model, price</code>
              <p className="text-[#666] mt-2">price 须为数值类型</p>
            </div>
          ) : (
            <div className="text-[#a1a1a1] text-sm space-y-1">
              <p>商品数据需包含以下列：</p>
              <code className="block text-[#3b82f6] mt-2">brand, category, model_std</code>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}