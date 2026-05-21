'use client'

import { useEffect, useState, useCallback } from 'react'
import { Zap, RefreshCw, Play, Pause, AlertTriangle, CheckCircle, Clock, TrendingUp, Database, Activity, ChevronDown, ChevronUp } from 'lucide-react'

// ============ Types ============
interface PipelineTask {
  id: string
  name: string
  description: string
  type: 'sync' | 'async' | 'batch' | 'realtime'
  status: 'running' | 'stopped' | 'error' | 'completed'
  schedule: string
  last_run_at: string
  next_run_at: string
  duration_ms: number
  progress: number
  records_processed: number
  error_message?: string
  created_at: string
  updated_at: string
}

interface PipelineStats {
  total_tasks: number
  running_tasks: number
  stopped_tasks: number
  error_tasks: number
  total_records_today: number
  avg_duration_ms: number
  success_rate: number
}

interface PipelineLog {
  id: string
  task_id: string
  task_name: string
  status: 'started' | 'completed' | 'failed'
  started_at: string
  completed_at?: string
  duration_ms?: number
  records_processed: number
  error_message?: string
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
  return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

function getStatusColor(status: string): { bg: string; text: string; icon: React.ElementType } {
  switch (status) {
    case 'running': return { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Activity }
    case 'stopped': return { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: Pause }
    case 'error': return { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertTriangle }
    case 'completed': return { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle }
    default: return { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: Activity }
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'running': return '运行中'
    case 'stopped': return '已停止'
    case 'error': return '错误'
    case 'completed': return '已完成'
    default: return status
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'realtime': return 'bg-purple-500/20 text-purple-400'
    case 'batch': return 'bg-orange-500/20 text-orange-400'
    case 'sync': return 'bg-blue-500/20 text-blue-400'
    case 'async': return 'bg-green-500/20 text-green-400'
    default: return 'bg-gray-500/20 text-gray-400'
  }
}

// ============ API Functions ============
async function fetchPipelineStats(): Promise<PipelineStats> {
  const res = await fetch('/api/v1/pipeline/stats')
  if (!res.ok) throw new Error('Failed to fetch pipeline stats')
  const data: ApiResponse<PipelineStats> = await res.json()
  return data.data
}

async function fetchPipelineTasks(): Promise<PipelineTask[]> {
  const res = await fetch('/api/v1/pipeline/tasks')
  if (!res.ok) throw new Error('Failed to fetch pipeline tasks')
  const data: ApiResponse<PipelineTask[]> = await res.json()
  return data.data || []
}

async function fetchPipelineLogs(limit: number = 20): Promise<PipelineLog[]> {
  const res = await fetch(`/api/v1/pipeline/logs?limit=${limit}`)
  if (!res.ok) throw new Error('Failed to fetch pipeline logs')
  const data: ApiResponse<PipelineLog[]> = await res.json()
  return data.data || []
}

async function updateTaskStatus(taskId: string, status: string): Promise<void> {
  const res = await fetch(`/api/v1/pipeline/tasks/${taskId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
  if (!res.ok) throw new Error('Failed to update task status')
}

async function triggerTask(taskId: string): Promise<void> {
  const res = await fetch(`/api/v1/pipeline/tasks/${taskId}/trigger`, {
    method: 'POST'
  })
  if (!res.ok) throw new Error('Failed to trigger task')
}

// ============ Components ============
function StatCard({ title, value, subtitle, icon: Icon, color }: { title: string; value: number | string; subtitle?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <div className="text-sm text-[#a1a1a1]">{title}</div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {subtitle && <div className="text-xs text-[#666]">{subtitle}</div>}
      </div>
    </div>
  )
}

function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-24 bg-[#1a1a1a] rounded-xl border border-[#262626] animate-pulse" />
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
export default function PipelinePage() {
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<PipelineTask[]>([])
  const [logs, setLogs] = useState<PipelineLog[]>([])
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [tasksData, logsData, statsData] = await Promise.all([
        fetchPipelineTasks(),
        fetchPipelineLogs(),
        fetchPipelineStats()
      ])
      setTasks(tasksData)
      setLogs(logsData)
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    setUpdating(taskId)
    try {
      await updateTaskStatus(taskId, newStatus)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setUpdating(null)
    }
  }

  const handleTriggerTask = async (taskId: string) => {
    setUpdating(taskId)
    try {
      await triggerTask(taskId)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger task')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">数据管道</h1>
          <p className="text-sm text-[#a1a1a1] mt-1">监控与管理数据处理任务</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#262626] text-white px-4 py-2 rounded-lg border border-[#262626] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-sm">刷新</span>
        </button>
      </div>

      {/* Error */}
      {error && <ErrorState message={error} onRetry={fetchData} />}

      {/* Stats */}
      {!error && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="任务总数" value={stats.total_tasks} subtitle="全部任务" icon={Zap} color="bg-[#3b82f6]" />
          <StatCard title="运行中" value={stats.running_tasks} subtitle="当前执行" icon={Activity} color="bg-green-500" />
          <StatCard title="今日处理" value={stats.total_records_today.toLocaleString()} subtitle="记录数" icon={Database} color="bg-purple-500" />
          <StatCard title="成功率" value={`${(stats.success_rate * 100).toFixed(1)}%`} subtitle="今日" icon={TrendingUp} color="bg-orange-500" />
        </div>
      )}

      {/* Pipeline Tasks */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#3b82f6]" />
          任务列表
        </h2>
        
        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : tasks.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-8 text-center text-[#a1a1a1]">
            暂无任务数据
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const statusStyle = getStatusColor(task.status)
              const StatusIcon = statusStyle.icon
              const isExpanded = expandedTask === task.id
              
              return (
                <div key={task.id} className="bg-[#1a1a1a] rounded-xl border border-[#262626] overflow-hidden">
                  <div 
                    className="p-4 cursor-pointer hover:bg-[#1f1f1f] transition-colors"
                    onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${statusStyle.bg} flex items-center justify-center`}>
                          <StatusIcon className={`w-5 h-5 ${statusStyle.text}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{task.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${getTypeColor(task.type)}`}>
                              {task.type}
                            </span>
                          </div>
                          <div className="text-sm text-[#a1a1a1] mt-0.5">{task.description}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                          <div className="text-sm text-[#a1a1a1]">调度: {task.schedule}</div>
                          <div className="text-xs text-[#666]">
                            {task.status === 'running' ? '运行中...' : `上次: ${formatDateTime(task.last_run_at)}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {task.status === 'running' ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStatusUpdate(task.id, 'stopped'); }}
                              disabled={updating === task.id}
                              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                            >
                              停止
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleTriggerTask(task.id); }}
                              disabled={updating === task.id}
                              className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                            >
                              执行
                            </button>
                          )}
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress bar for running tasks */}
                    {task.status === 'running' && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-[#a1a1a1] mb-1">
                          <span>处理进度</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-[#262626] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#3b82f6] transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-[#262626]">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <div className="text-xs text-[#666]">状态</div>
                          <div className={`text-sm ${statusStyle.text}`}>{getStatusText(task.status)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#666]">执行时长</div>
                          <div className="text-sm text-white">{formatDuration(task.duration_ms)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#666]">处理记录</div>
                          <div className="text-sm text-white">{task.records_processed.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-xs text-[#666]">下次执行</div>
                          <div className="text-sm text-white">{task.next_run_at ? formatDateTime(task.next_run_at) : '-'}</div>
                        </div>
                      </div>
                      {task.error_message && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <div className="text-xs text-red-400">错误信息</div>
                          <div className="text-sm text-red-300 mt-1">{task.error_message}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Recent Logs */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#3b82f6]" />
          最近执行记录
        </h2>
        
        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : logs.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-8 text-center text-[#a1a1a1]">
            暂无执行记录
          </div>
        ) : (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#262626]">
                  <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">任务</th>
                  <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">状态</th>
                  <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3 hidden md:table-cell">开始时间</th>
                  <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3 hidden lg:table-cell">耗时</th>
                  <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3 hidden lg:table-cell">处理记录</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-[#262626] last:border-0 hover:bg-[#1f1f1f] transition-colors">
                    <td className="px-4 py-3 text-sm text-white">{log.task_name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        log.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        log.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {log.status === 'completed' ? '成功' : log.status === 'failed' ? '失败' : '进行中'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#a1a1a1] hidden md:table-cell">
                      {formatDateTime(log.started_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#a1a1a1] hidden lg:table-cell">
                      {log.duration_ms ? formatDuration(log.duration_ms) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#a1a1a1] hidden lg:table-cell">
                      {log.records_processed.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
