'use client'

import { useEffect, useState, useCallback } from 'react'
import { BarChart3, Search, RefreshCw, Filter, Download, ChevronLeft, ChevronRight, Clock, User, Activity, AlertTriangle, CheckCircle } from 'lucide-react'

// ============ Types ============
interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'debug'
  module: string
  action: string
  user_id?: string
  user_name?: string
  supplier_id?: string
  supplier_name?: string
  details: string
  ip_address: string
  user_agent: string
  duration_ms?: number
  status_code?: number
}

interface LogStats {
  total_logs: number
  info_count: number
  warning_count: number
  error_count: number
  debug_count: number
}

interface ApiResponse<T> {
  data: T
  total?: number
  page?: number
  page_size?: number
}

// ============ Utility Functions ============
function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatTimeAgo(dateString: string): string {
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

function getLevelColor(level: string): { bg: string; text: string; icon: React.ElementType } {
  switch (level) {
    case 'error': return { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertTriangle }
    case 'warning': return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: AlertTriangle }
    case 'info': return { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: CheckCircle }
    case 'debug': return { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: Activity }
    default: return { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: Activity }
  }
}

function getLevelText(level: string): string {
  switch (level) {
    case 'error': return '错误'
    case 'warning': return '警告'
    case 'info': return '信息'
    case 'debug': return '调试'
    default: return level
  }
}

// ============ API Functions ============
async function fetchLogStats(): Promise<LogStats> {
  const res = await fetch('/api/v1/admin/logs/stats')
  if (!res.ok) throw new Error('日志统计加载失败')
  const data: ApiResponse<LogStats> = await res.json()
  return data.data
}

async function fetchLogs(page: number = 1, pageSize: number = 20, filters: { level?: string; module?: string; search?: string; start_date?: string; end_date?: string } = {}): Promise<{ data: LogEntry[]; total: number }> {
  const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() })
  if (filters.level) params.append('level', filters.level)
  if (filters.module) params.append('module', filters.module)
  if (filters.search) params.append('search', filters.search)
  if (filters.start_date) params.append('start_date', filters.start_date)
  if (filters.end_date) params.append('end_date', filters.end_date)
  
  const res = await fetch(`/api/v1/admin/logs?${params}`)
  if (!res.ok) throw new Error('日志列表加载失败')
  const data: ApiResponse<LogEntry[]> = await res.json()
  return { data: data.data || [], total: data.total || 0 }
}

// ============ Components ============
function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-4">
      <div className="text-sm text-[#a1a1a1]">{title}</div>
      <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
    </div>
  )
}

function LoadingSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 bg-[#1a1a1a] rounded-xl border border-[#262626] animate-pulse" />
      ))}
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
      <span className="text-red-400 text-sm">{message}</span>
      <button onClick={onRetry} className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1 rounded transition-colors">
        重试
      </button>
    </div>
  )
}

// ============ Main Page Component ============
export default function LogsPage() {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(20)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [levelFilter, setLevelFilter] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [logsData, statsData] = await Promise.all([
        fetchLogs(page, pageSize, { level: levelFilter, module: moduleFilter, search, start_date: startDate, end_date: endDate }),
        fetchLogStats()
      ])
      setLogs(logsData.data)
      setTotal(logsData.total)
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : '数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, levelFilter, moduleFilter, search, startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchData()
  }

  const handleFilterChange = () => {
    setPage(1)
    fetchData()
  }

  const totalPages = Math.ceil(total / pageSize)

  const modules = ['api', 'datacenter', 'search', 'pipeline', 'admin', 'supplier', 'auth']

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">操作日志</h1>
          <p className="text-sm text-[#a1a1a1] mt-1">查看系统操作记录与审计追踪</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#262626] text-white px-4 py-2 rounded-lg border transition-colors ${showFilters ? 'border-[#3b82f6]' : 'border-[#262626]'}`}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm">筛选</span>
          </button>
          <button className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#262626] text-white px-4 py-2 rounded-lg border border-[#262626] transition-colors">
            <Download className="w-4 h-4" />
            <span className="text-sm">导出</span>
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#262626] text-white px-4 py-2 rounded-lg border border-[#262626] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm">刷新</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <ErrorState message={error} onRetry={fetchData} />}

      {/* Stats */}
      {!error && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="日志总数" value={stats.total_logs} color="text-white" />
          <StatCard title="信息" value={stats.info_count} color="text-blue-400" />
          <StatCard title="警告" value={stats.warning_count} color="text-yellow-400" />
          <StatCard title="错误" value={stats.error_count} color="text-red-400" />
          <StatCard title="调试" value={stats.debug_count} color="text-gray-400" />
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="搜索操作内容、用户..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#262626] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#666] focus:outline-none focus:border-[#3b82f6]"
              />
            </div>
            <select
              value={levelFilter}
              onChange={(e) => { setLevelFilter(e.target.value); handleFilterChange(); }}
              className="bg-[#262626] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]"
            >
              <option value="">全部级别</option>
              <option value="error">错误</option>
              <option value="warning">警告</option>
              <option value="info">信息</option>
              <option value="debug">调试</option>
            </select>
            <select
              value={moduleFilter}
              onChange={(e) => { setModuleFilter(e.target.value); handleFilterChange(); }}
              className="bg-[#262626] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]"
            >
              <option value="">全部模块</option>
              {modules.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); handleFilterChange(); }}
              className="bg-[#262626] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); handleFilterChange(); }}
              className="bg-[#262626] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]"
            />
            <button type="submit" className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-lg text-sm transition-colors">
              搜索
            </button>
          </form>
        </div>
      )}

      {/* Log List */}
      <div className="space-y-2">
        {loading ? (
          <LoadingSkeleton rows={10} />
        ) : logs.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-8 text-center text-[#a1a1a1]">
            暂无日志数据
          </div>
        ) : (
          logs.map((log) => {
            const levelStyle = getLevelColor(log.level)
            const LevelIcon = levelStyle.icon
            return (
              <div key={log.id} className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-4 hover:border-[#3b82f6]/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg ${levelStyle.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <LevelIcon className={`w-4 h-4 ${levelStyle.text}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium ${levelStyle.text}`}>
                          [{getLevelText(log.level)}]
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-[#262626] rounded text-[#a1a1a1]">
                          {log.module}
                        </span>
                        <span className="text-sm text-white font-medium">{log.action}</span>
                      </div>
                      <div className="text-sm text-[#a1a1a1] mt-1">{log.details}</div>
                      {(log.user_name || log.supplier_name) && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-[#666]">
                          <User className="w-3 h-3" />
                          <span>{log.user_name || log.supplier_name}</span>
                          {log.supplier_id && <span>供应商ID: {log.supplier_id}</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-[#666]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(log.timestamp)}
                        </span>
                        <span>IP: {log.ip_address}</span>
                        {log.duration_ms && <span>耗时: {log.duration_ms}ms</span>}
                        {log.status_code && <span>状态码: {log.status_code}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-[#666] shrink-0">
                    {formatTimeAgo(log.timestamp)}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-[#a1a1a1]">
            共 {total} 条，第 {page} / {totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 bg-[#262626] hover:bg-[#333] text-white px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> 上一页
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 bg-[#262626] hover:bg-[#333] text-white px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
