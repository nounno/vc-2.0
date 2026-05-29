'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react'
import { uploadQuoteFile, getTaskResult, TaskResult } from '../lib/api'

type UploadState = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

export default function UploadPage() {
  const [state, setState] = useState<UploadState>('idle')
  const [fileName, setFileName] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [result, setResult] = useState<TaskResult['result'] | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const reset = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setState('idle')
    setFileName('')
    setUploadProgress(0)
    setResult(null)
    setErrorMsg('')
  }, [])

  const startPolling = useCallback((taskId: string) => {
    setState('processing')
    pollingRef.current = setInterval(async () => {
      try {
        const res = await getTaskResult(taskId)
        if (res.status === 'completed' || res.status === 'done') {
          clearInterval(pollingRef.current!)
          pollingRef.current = null
          setResult(res.result ?? null)
          setState('done')
        }
      } catch {
        clearInterval(pollingRef.current!)
        pollingRef.current = null
        setErrorMsg('获取解析结果失败，请重试')
        setState('error')
      }
    }, 2000)
  }, [])

  const handleFile = useCallback(
    async (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
        setErrorMsg('仅支持 .xlsx、.xls、.csv 格式的 Excel 文件')
        setState('error')
        return
      }

      setFileName(file.name)
      setUploadProgress(0)
      setState('uploading')

      try {
        const { task_id: taskId } = await uploadQuoteFile(file)

        startPolling(taskId)
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : '上传失败，请重试')
        setState('error')
      }
    },
    [startPolling]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [handleFile]
  )

  const totalCount =
    result
      ? (result.high_count ?? 0) + (result.medium_count ?? 0) + (result.low_count ?? 0)
      : 0

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">上传报价</h1>
        <p className="text-[#a1a1a1]">上传 Excel 报价单，系统将自动解析并入库</p>
      </div>

      {/* Idle: Upload drop zone */}
      {state === 'idle' && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#3b82f6]/40 rounded-2xl bg-[#111111] p-16 flex flex-col items-center justify-center cursor-pointer hover:border-[#3b82f6] hover:bg-[#1a1a1a] transition-all"
        >
          <div className="w-16 h-16 rounded-full bg-[#3b82f6]/10 flex items-center justify-center mb-5">
            <Upload className="w-8 h-8 text-[#3b82f6]" />
          </div>
          <p className="text-white text-lg font-medium mb-2">拖拽文件到此处，或点击选择 Excel 文件上传</p>
          <p className="text-[#666] text-sm">支持 .xlsx、.xls、.csv 格式</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* Uploading */}
      {state === 'uploading' && (
        <div className="border border-[#262626] rounded-2xl bg-[#111111] p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#3b82f6]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{fileName}</p>
              <p className="text-[#a1a1a1] text-xs">正在上传...</p>
            </div>
            <span className="text-[#3b82f6] text-sm font-medium">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-[#262626] rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-[#3b82f6] rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Processing */}
      {state === 'processing' && (
        <div className="border border-[#262626] rounded-2xl bg-[#111111] p-16 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#3b82f6] animate-spin mb-5" />
          <p className="text-white text-lg font-medium mb-2">正在解析数据...</p>
          <p className="text-[#666] text-sm">{fileName}</p>
        </div>
      )}

      {/* Done: Result cards */}
      {state === 'done' && result && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* High quality */}
            <div className="border border-[#262626] rounded-xl bg-[#111111] p-6 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="text-3xl font-bold text-emerald-400 mb-1">
                {result.high_count ?? 0}
              </span>
              <span className="text-sm text-[#a1a1a1]">🟢 高质量</span>
            </div>

            {/* Medium quality */}
            <div className="border border-[#262626] rounded-xl bg-[#111111] p-6 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-3xl font-bold text-blue-400 mb-1">
                {result.medium_count ?? 0}
              </span>
              <span className="text-sm text-[#a1a1a1]">🔵 中等</span>
            </div>

            {/* Low quality */}
            <div className="border border-[#262626] rounded-xl bg-[#111111] p-6 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6 text-orange-400" />
              </div>
              <span className="text-3xl font-bold text-orange-400 mb-1">
                {result.low_count ?? 0}
              </span>
              <span className="text-sm text-[#a1a1a1]">🟠 低质量</span>
            </div>
          </div>

          {/* Total + Retry */}
          <div className="border border-[#262626] rounded-xl bg-[#111111] p-6 flex items-center justify-between">
            <div>
              <span className="text-[#a1a1a1] text-sm">总计解析记录：</span>
              <span className="text-white text-lg font-bold ml-2">{totalCount} 条</span>
            </div>
            <button
              onClick={reset}
              className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium rounded-lg transition-colors"
            >
              重新上传
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="border border-red-500/30 rounded-2xl bg-[#111111] p-16 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-5">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-white text-lg font-medium mb-2">上传失败</p>
          <p className="text-[#a1a1a1] text-sm mb-6">{errorMsg}</p>
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium rounded-lg transition-colors"
          >
            重新上传
          </button>
        </div>
      )}
    </div>
  )
}
