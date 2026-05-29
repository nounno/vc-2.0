'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw, Clock, AlertCircle, CheckCircle, Plus, Trash2, X } from 'lucide-react'

// Types
interface Supplier {
  id: number
  supplier_code: string
  supplier_name: string
  freshness: 'pending' | 'archived'
  updated_at: string
}

interface FreshnessSupplier {
  supplier_name: string
  freshness: 'pending' | 'archived'
  updated_at: string
}

interface QualityScore {
  supplier_name: string
  data_quality_score: number
  parse_success_rate: number
  total_records: number
  freshness: 'pending' | 'archived'
  updated_at?: string
}

// Utility function
function calculateTimeAgo(dateString: string): string {
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

// API Functions
async function fetchSuppliers(): Promise<Supplier[]> {
  const res = await fetch('/api/v1/suppliers')
  if (!res.ok) throw new Error('供应商列表加载失败')
  const data = await res.json()
  return data.suppliers || []
}

interface CreateSupplierResult {
  id: number
  supplier_code: string
  supplier_name: string
  account: { username: string; raw_password: string }
}

async function createSupplier(supplierCode: string, supplierName: string, username?: string, password?: string): Promise<CreateSupplierResult> {
  const res = await fetch('/api/v1/suppliers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supplier_code: supplierCode,
      supplier_name: supplierName,
      ...(username ? { username } : {}),
      ...(password ? { password } : {}),
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: '创建供应商失败' }))
    throw new Error(err.detail || '创建供应商失败')
  }
  return res.json()
}

async function deleteSupplier(supplierId: number): Promise<void> {
  const res = await fetch(`/api/v1/suppliers/${supplierId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('删除供应商失败')
}

async function fetchFreshness(): Promise<{ suppliers: FreshnessSupplier[] }> {
  const res = await fetch('/api/v1/suppliers/freshness')
  if (!res.ok) throw new Error('数据新鲜度加载失败')
  return res.json()
}

async function fetchQualityScores(): Promise<QualityScore[]> {
  const res = await fetch('/api/v1/suppliers/quality')
  if (!res.ok) return []
  const data = await res.json()
  return data.suppliers || []
}

// Components
function SectionHeader({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-[#3b82f6]" />
      <h2 className="text-lg font-semibold text-white">{title}</h2>
    </div>
  )
}

function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={`bg-[#1a1a1a] rounded-xl border border-[#262626] animate-pulse ${className || 'h-64'}`} />
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
      <span className="text-red-400 text-sm">{message}</span>
      <button
        onClick={onRetry}
        className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1 rounded transition-colors"
      >
        重试
      </button>
    </div>
  )
}

// Main Page Component
export default function SuppliersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [freshnessData, setFreshnessData] = useState<FreshnessSupplier[]>([])
  const [qualityData, setQualityData] = useState<QualityScore[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'archived'>('all')

  // Add supplier modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSupplierCode, setNewSupplierCode] = useState('')
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [addingSupplier, setAddingSupplier] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Created supplier credentials modal
  const [showCredModal, setShowCredModal] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string; supplierName: string } | null>(null)

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null)
  const [deletingSupplier, setDeletingSupplier] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [suppliersData, freshness, quality] = await Promise.all([
        fetchSuppliers().catch(() => []),
        fetchFreshness().catch(() => ({ suppliers: [] })),
        fetchQualityScores().catch(() => [])
      ])

      setSuppliers(suppliersData)
      setFreshnessData(freshness.suppliers || [])
      setQualityData(Array.isArray(quality) ? quality : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handle add supplier
  const handleAddSupplier = async () => {
    if (!newSupplierCode.trim() || !newSupplierName.trim()) {
      setAddError('请填写所有必填字段')
      return
    }
    setAddingSupplier(true)
    setAddError(null)
    try {
      const result = await createSupplier(
        newSupplierCode.trim(),
        newSupplierName.trim(),
        newUsername.trim() || undefined,
        newPassword.trim() || undefined
      )
      setShowAddModal(false)
      setNewSupplierCode('')
      setNewSupplierName('')
      setNewUsername('')
      setNewPassword('')
      setCreatedCredentials({
        username: result.account?.username || `supplier_${result.supplier_code}`,
        password: result.account?.raw_password || '未知',
        supplierName: result.supplier_name,
      })
      setShowCredModal(true)
      await fetchData()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : '创建供应商失败')
    } finally {
      setAddingSupplier(false)
    }
  }

  // Handle delete supplier
  const handleDeleteClick = (supplier: Supplier) => {
    setSupplierToDelete(supplier)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return
    setDeletingSupplier(true)
    try {
      await deleteSupplier(supplierToDelete.id)
      setShowDeleteModal(false)
      setSupplierToDelete(null)
      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除供应商失败')
    } finally {
      setDeletingSupplier(false)
    }
  }

  // Get quality score for a supplier
  const getQualityScore = (supplierName: string): number | null => {
    const found = qualityData.find(
      (q) => q.supplier_name === supplierName || q.supplier_name.includes(supplierName) || supplierName.includes(q.supplier_name)
    )
    return found?.data_quality_score ?? null
  }

  // Filter suppliers
  const filteredSuppliers = freshnessData.filter((supplier) => {
    const matchesSearch = supplier.supplier_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || supplier.freshness === statusFilter
    return matchesSearch && matchesStatus
  })

  // Status badge
  const StatusBadge = ({ status }: { status: 'pending' | 'archived' }) => {
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
          <AlertCircle className="w-3 h-3" />
          待处理
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
        <CheckCircle className="w-3 h-3" />
        已归档
      </span>
    )
  }

  // Handle row click
  const handleRowClick = (supplierName: string) => {
    // Navigate to supplier detail page - find the id from quality data or use encoded name
    const supplier = qualityData.find(
      (q) => q.supplier_name === supplierName || q.supplier_name.includes(supplierName) || supplierName.includes(q.supplier_name)
    )
    const id = supplier?.supplier_name || encodeURIComponent(supplierName)
    router.push(`/suppliers/${encodeURIComponent(id)}`)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">供应商管理</h1>
          <p className="text-sm text-[#a1a1a1] mt-1">数据新鲜度监控 · {new Date().toLocaleDateString('zh-CN')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#262626] text-white px-4 py-2 rounded-lg border border-[#262626] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm">刷新数据</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">新增供应商</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
            <input
              type="text"
              placeholder="搜索供应商名称..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#3b82f6]/50"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-[#3b82f6] text-white'
                  : 'bg-[#0a0a0a] text-[#a1a1a1] hover:text-white border border-[#262626]'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-orange-500 text-white'
                  : 'bg-[#0a0a0a] text-[#a1a1a1] hover:text-white border border-[#262626]'
              }`}
            >
              待处理
            </button>
            <button
              onClick={() => setStatusFilter('archived')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'archived'
                  ? 'bg-gray-500 text-white'
                  : 'bg-[#0a0a0a] text-[#a1a1a1] hover:text-white border border-[#262626]'
              }`}
            >
              已归档
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : loading ? (
        <LoadingSkeleton />
      ) : suppliers.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-8 text-center">
          <AlertCircle className="w-12 h-12 text-[#666] mx-auto mb-3" />
          <p className="text-[#a1a1a1]">暂无供应商数据</p>
          <p className="text-sm text-[#666] mt-1">点击上方"新增供应商"按钮添加</p>
        </div>
      ) : (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#262626]">
                  <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">供应商编号</th>
                  <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">供应商名称</th>
                  <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">状态</th>
                  <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">更新时间</th>
                  <th className="text-left text-xs font-medium text-[#a1a1a1] px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => {
                  const freshnessItem = freshnessData.find(f => f.supplier_name === supplier.supplier_name)
                  return (
                    <tr
                      key={supplier.id}
                      className="border-b border-[#262626] last:border-0 hover:bg-[#1f1f1f] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm text-white font-medium">{supplier.supplier_code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-white font-medium">{supplier.supplier_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={supplier.freshness || freshnessItem?.freshness || 'pending'} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-sm text-[#a1a1a1]">
                          <Clock className="w-3 h-3" />
                          {calculateTimeAgo(supplier.updated_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(supplier); }}
                          className="flex items-center gap-1 text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          删除
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[#262626]">
            <span className="text-sm text-[#a1a1a1]">
              共 {suppliers.length} 家供应商
            </span>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-[#1a1a1a] border border-[#262626] rounded-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#262626] flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">新增供应商</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#666] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-[#a1a1a1] mb-2">
                  供应商编号 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newSupplierCode}
                  onChange={(e) => setNewSupplierCode(e.target.value)}
                  placeholder="例如: SUP001"
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#3b82f6]"
                />
              </div>
              <div>
                <label className="block text-sm text-[#a1a1a1] mb-2">
                  供应商名称 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="例如: 深圳华强电子有限公司"
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#3b82f6]"
                />
              </div>
              <div className="border-t border-[#262626] pt-4">
                <p className="text-xs text-[#666] mb-3">登录账号（留空则自动生成）</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-[#a1a1a1] mb-2">用户名</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="自动生成"
                      className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#a1a1a1] mb-2">密码</label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="自动生成"
                      className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                </div>
              </div>
              {addError && (
                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  {addError}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[#262626] flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-white rounded-lg text-sm transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddSupplier}
                disabled={addingSupplier}
                className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {addingSupplier ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && supplierToDelete && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-[#1a1a1a] border border-[#262626] rounded-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#262626]">
              <h2 className="text-xl font-bold text-white">确认删除</h2>
            </div>
            <div className="p-6">
              <p className="text-[#a1a1a1] mb-2">
                确定要删除供应商 <span className="text-white font-medium">{supplierToDelete.supplier_name}</span> 吗？
              </p>
              <p className="text-sm text-red-400">此操作不可恢复，请谨慎操作。</p>
            </div>
            <div className="p-6 border-t border-[#262626] flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-white rounded-lg text-sm transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingSupplier}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {deletingSupplier ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Success Modal */}
      {showCredModal && createdCredentials && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCredModal(false)}
        >
          <div
            className="bg-[#1a1a1a] border border-[#262626] rounded-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#262626] flex items-center justify-between">
              <h2 className="text-xl font-bold text-green-400">创建成功</h2>
              <button
                onClick={() => setShowCredModal(false)}
                className="text-[#666] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#a1a1a1]">
                供应商 <span className="text-white font-medium">{createdCredentials.supplierName}</span> 已创建，登录信息如下：
              </p>
              <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#a1a1a1]">登录地址</span>
                  <span className="text-sm text-blue-400 font-mono">supplier.ibotclaw.com</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#a1a1a1]">用户名</span>
                  <span className="text-sm text-white font-mono">{createdCredentials.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#a1a1a1]">密码</span>
                  <span className="text-sm text-green-400 font-mono font-bold">{createdCredentials.password}</span>
                </div>
              </div>
              <p className="text-xs text-yellow-500/80">请妥善保管此密码，关闭后无法再次查看</p>
            </div>
            <div className="p-6 border-t border-[#262626] flex justify-end">
              <button
                onClick={() => setShowCredModal(false)}
                className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg text-sm transition-colors"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
