'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Search, RefreshCw, CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'

// ============ Types ============
interface Account {
  id: string
  supplier_id: string
  supplier_name: string
  contact_name: string
  contact_phone: string
  contact_email: string
  account_status: 'active' | 'inactive' | 'suspended'
  quality_score: number
  created_at: string
  last_active_at: string
  total_quotes: number
  pending_quotes: number
  approved_quotes: number
  rejected_quotes: number
}

interface AccountStats {
  total_accounts: number
  active_accounts: number
  inactive_accounts: number
  suspended_accounts: number
  avg_quality_score: number
}

interface ApiResponse<T> {
  data: T
  total?: number
  page?: number
  page_size?: number
}

// ============ Utility Functions ============
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30'
    case 'inactive': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    case 'suspended': return 'bg-red-500/20 text-red-400 border-red-500/30'
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'active': return '正常'
    case 'inactive': return '未激活'
    case 'suspended': return '已停用'
    default: return status
  }
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-400'
  if (score >= 70) return 'text-yellow-400'
  if (score >= 50) return 'text-orange-400'
  return 'text-red-400'
}

function getScoreBarColor(score: number): string {
  if (score >= 90) return 'bg-green-500'
  if (score >= 70) return 'bg-yellow-500'
  if (score >= 50) return 'bg-orange-500'
  return 'bg-red-500'
}

// ============ API Functions ============
async function fetchAccountStats(): Promise<AccountStats> {
  const res = await fetch('/api/v1/admin/accounts/stats')
  if (!res.ok) throw new Error('Failed to fetch account stats')
  const data: ApiResponse<AccountStats> = await res.json()
  return data.data
}

async function fetchAccounts(page: number = 1, pageSize: number = 10, search: string = ''): Promise<{ data: Account[]; total: number }> {
  const params = new URLSearchParams({ page: page.toString(), page_size: pageSize.toString() })
  if (search) params.append('search', search)
  const res = await fetch(`/api/v1/admin/accounts?${params}`)
  if (!res.ok) throw new Error('Failed to fetch accounts')
  const data: ApiResponse<Account[]> = await res.json()
  return { data: data.data || [], total: data.total || 0 }
}

async function updateAccountStatus(accountId: string, status: string): Promise<void> {
  const res = await fetch(`/api/v1/admin/accounts/${accountId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
  if (!res.ok) throw new Error('Failed to update account status')
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
export default function AccountsPage() {
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [stats, setStats] = useState<AccountStats | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(10)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [accountsData, statsData] = await Promise.all([
        fetchAccounts(page, pageSize, search),
        fetchAccountStats()
      ])
      setAccounts(accountsData.data)
      setTotal(accountsData.total)
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchData()
  }

  const handleStatusUpdate = async (accountId: string, newStatus: string) => {
    setUpdating(accountId)
    try {
      await updateAccountStatus(accountId, newStatus)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setUpdating(null)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">供应商账户</h1>
          <p className="text-sm text-[#a1a1a1] mt-1">管理供应商账户状态与权限</p>
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

      {/* Stats */}
      {error && <ErrorState message={error} onRetry={fetchData} />}

      {!error && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="账户总数" value={stats.total_accounts} subtitle="全部账户" icon={Users} color="bg-[#3b82f6]" />
          <StatCard title="正常" value={stats.active_accounts} subtitle="可登录" icon={CheckCircle} color="bg-green-500" />
          <StatCard title="未激活" value={stats.inactive_accounts} subtitle="待激活" icon={AlertTriangle} color="bg-yellow-500" />
          <StatCard title="已停用" value={stats.suspended_accounts} subtitle="已禁用" icon={XCircle} color="bg-red-500" />
          <StatCard title="平均质量分" value={stats.avg_quality_score.toFixed(1)} subtitle="综合评分" icon={Users} color="bg-purple-500" />
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
          <input
            type="text"
            placeholder="搜索供应商名称、联系人、电话..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-[#666] focus:outline-none focus:border-[#3b82f6]"
          />
        </div>
        <button type="submit" className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-lg text-sm transition-colors">
          搜索
        </button>
      </form>

      {/* Table */}
      <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] overflow-hidden">
        {loading ? (
          <div className="p-4"><LoadingSkeleton rows={5} /></div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center text-[#a1a1a1]">暂无账户数据</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#262626]">
                    <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">供应商</th>
                    <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">联系人</th>
                    <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3 hidden md:table-cell">联系方式</th>
                    <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">状态</th>
                    <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3 hidden lg:table-cell">质量分</th>
                    <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3 hidden lg:table-cell">报价统计</th>
                    <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3 hidden xl:table-cell">最近活跃</th>
                    <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id} className="border-b border-[#262626] last:border-0 hover:bg-[#1f1f1f] transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-white">{account.supplier_name}</div>
                        <div className="text-xs text-[#666]">ID: {account.supplier_id}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#a1a1a1]">{account.contact_name}</td>
                      <td className="px-4 py-3 text-sm text-[#a1a1a1] hidden md:table-cell">
                        <div>{account.contact_phone}</div>
                        <div className="text-xs text-[#666]">{account.contact_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(account.account_status)}`}>
                          {getStatusText(account.account_status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${getScoreColor(account.quality_score)}`}>
                            {account.quality_score.toFixed(1)}
                          </span>
                          <div className="w-16 h-1.5 bg-[#262626] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getScoreBarColor(account.quality_score)}`}
                              style={{ width: `${account.quality_score}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="text-xs text-[#a1a1a1]">
                          <span className="text-green-400">✓{account.approved_quotes}</span>
                          <span className="mx-1">/</span>
                          <span className="text-orange-400">⏳{account.pending_quotes}</span>
                          <span className="mx-1">/</span>
                          <span className="text-red-400">✗{account.rejected_quotes}</span>
                        </div>
                        <div className="text-xs text-[#666]">共 {account.total_quotes} 条报价</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#666] hidden xl:table-cell">
                        {formatDateTime(account.last_active_at)}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={account.account_status}
                          onChange={(e) => handleStatusUpdate(account.id, e.target.value)}
                          disabled={updating === account.id}
                          className="bg-[#262626] border border-[#3b82f6]/30 text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-[#3b82f6] disabled:opacity-50"
                        >
                          <option value="active">正常</option>
                          <option value="inactive">未激活</option>
                          <option value="suspended">停用</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#262626]">
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
          </>
        )}
      </div>
    </div>
  )
}
