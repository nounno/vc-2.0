'use client'
import { useState, useEffect } from 'react'

// ============ Types ============
interface Rule {
  id: number
  rule_text: string
  field: string
  trigger_pattern: string | null
  target_value: string | null
  supplier_id: number | null
  occurrence_count: number
  correction_count: number
  source: 'auto' | 'manual'
  status: 'learning' | 'active' | 'disabled'
  confidence_boost: number
  created_at: string
  updated_at: string
  activated_at: string | null
}

interface RulesSummary {
  total: number
  active: number
  learning: number
  by_field: { field: string; cnt: number }[]
  daily_trend_30d: { date: string; cnt: number }[]
}

// ============ API Base ============
const API_BASE = '/api/v1'

// ============ Field Config ============
const fieldColors: Record<string, string> = {
  category: 'bg-blue-500/20 text-blue-400',
  brand: 'bg-orange-500/20 text-orange-400',
  price: 'bg-green-500/20 text-green-400',
  model: 'bg-purple-500/20 text-purple-400',
  stock: 'bg-yellow-500/20 text-yellow-400',
}

const fieldLabels: Record<string, string> = {
  category: '品类',
  brand: '品牌',
  price: '价格',
  model: '型号',
  stock: '库存',
}

// ============ Utility Functions ============
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============ Main Component ============
export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [summary, setSummary] = useState<RulesSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [filterField, setFilterField] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null)

  // Fetch rules + summary
  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterField !== 'all') params.set('field', filterField)
      if (filterStatus !== 'all') params.set('status', filterStatus)

      const [rulesRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/rules?${params.toString()}`),
        fetch(`${API_BASE}/rules/summary`),
      ])

      if (rulesRes.ok && summaryRes.ok) {
        const rulesData = await rulesRes.json()
        const summaryData = await summaryRes.json()
        setRules(rulesData.rules || [])
        setSummary(summaryData)
      }
    } catch (err) {
      console.error('Failed to fetch rules:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [filterField, filterStatus])

  // Sync rules from correction logs
  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch(`${API_BASE}/rules/sync`, { method: 'POST' })
      if (res.ok) {
        const result = await res.json()
        alert(`同步完成：新建${result.created}条，激活${result.activated}条规则`)
        fetchData()
      }
    } catch (err) {
      console.error('Sync failed:', err)
      alert('同步失败')
    } finally {
      setSyncing(false)
    }
  }

  // Update rule status
  const handleStatusChange = async (ruleId: number, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchData()
        if (selectedRule?.id === ruleId) {
          setSelectedRule({ ...selectedRule, status: newStatus as Rule['status'] })
        }
      }
    } catch (err) {
      console.error('Update failed:', err)
    }
  }

  const activeRules = summary?.active ?? 0
  const totalRules = summary?.total ?? 0
  const learningRules = summary?.learning ?? 0

  const filteredRules = rules

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">规则学习记录</h1>
          <p className="text-white/60">
            三次纠正稳定后写入Rule表，共 {activeRules} 条活跃规则
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {syncing ? '同步中...' : '从纠正日志同步规则'}
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <div className="text-white/60 text-sm mb-2">活跃规则数</div>
          <div className="text-4xl font-bold text-green-400">{activeRules}</div>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <div className="text-white/60 text-sm mb-2">学习中的规则</div>
          <div className="text-4xl font-bold text-yellow-400">{learningRules}</div>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <div className="text-white/60 text-sm mb-2">规则总数</div>
          <div className="text-4xl font-bold text-white">{totalRules}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-sm">字段:</span>
          <select
            value={filterField}
            onChange={(e) => setFilterField(e.target.value)}
            className="bg-[#1a1a1a] border border-[#262626] rounded-lg text-white text-sm px-3 py-2 outline-none focus:border-[#3a3a3a]"
          >
            <option value="all">全部</option>
            <option value="category">品类(category)</option>
            <option value="brand">品牌(brand)</option>
            <option value="price">价格(price)</option>
            <option value="model">型号(model)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-sm">状态:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#1a1a1a] border border-[#262626] rounded-lg text-white text-sm px-3 py-2 outline-none focus:border-[#3a3a3a]"
          >
            <option value="all">全部</option>
            <option value="active">活跃</option>
            <option value="learning">学习中</option>
            <option value="disabled">已禁用</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-white/60">加载中...</div>
        </div>
      )}

      {/* Rules Table */}
      {!loading && filteredRules.length > 0 && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#262626]">
                <th className="text-left text-white/60 text-sm font-medium px-6 py-4">规则内容</th>
                <th className="text-left text-white/60 text-sm font-medium px-6 py-4">字段</th>
                <th className="text-left text-white/60 text-sm font-medium px-6 py-4">纠正次数</th>
                <th className="text-left text-white/60 text-sm font-medium px-6 py-4">触发次数</th>
                <th className="text-left text-white/60 text-sm font-medium px-6 py-4">来源</th>
                <th className="text-left text-white/60 text-sm font-medium px-6 py-4">状态</th>
                <th className="text-left text-white/60 text-sm font-medium px-6 py-4">创建时间</th>
                <th className="text-left text-white/60 text-sm font-medium px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map((rule) => (
                <tr key={rule.id} className="border-b border-[#262626] last:border-b-0 hover:bg-white/5">
                  <td className="px-6 py-4">
                    <span className="font-medium text-white">{rule.rule_text}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-1 rounded text-xs ${fieldColors[rule.field] || 'bg-gray-500/20 text-gray-400'}`}>
                      {fieldLabels[rule.field] || rule.field}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {rule.correction_count >= 3 ? (
                      <span className="text-green-400">3次 ✓</span>
                    ) : (
                      <span className="text-white/60">{rule.correction_count}/3次</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white/60">{rule.occurrence_count}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-1 rounded text-xs ${
                      rule.source === 'auto'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {rule.source === 'auto' ? '自动学习' : '人工确认'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-1 rounded text-xs ${
                      rule.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : rule.status === 'learning'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {rule.status === 'active' ? '活跃' : rule.status === 'learning' ? '学习中' : '已禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/60 text-sm">
                    {formatDate(rule.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedRule(rule)}
                      className="text-blue-400 hover:text-blue-300 text-sm mr-3"
                    >
                      查看
                    </button>
                    {rule.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(rule.id, 'disabled')}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        禁用
                      </button>
                    )}
                    {rule.status === 'disabled' && (
                      <button
                        onClick={() => handleStatusChange(rule.id, 'active')}
                        className="text-green-400 hover:text-green-300 text-sm"
                      >
                        启用
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredRules.length === 0 && (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-12 flex flex-col items-center justify-center">
          <div className="text-4xl mb-4">📋</div>
          <div className="text-white text-lg mb-2">暂无学习规则</div>
          <div className="text-white/60 text-sm text-center">
            {filterField !== 'all' || filterStatus !== 'all'
              ? '当前筛选条件下没有规则，试试调整筛选条件'
              : '规则将在三次纠正后自动生成，点击右上角按钮手动同步'}
          </div>
        </div>
      )}

      {/* Rule Detail Modal */}
      {selectedRule && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedRule(null)}
        >
          <div
            className="bg-[#1a1a1a] border border-[#262626] rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#262626]">
              <h2 className="text-xl font-bold text-white">规则详情</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-white/60 text-sm mb-1">规则</div>
                <div className="text-white font-medium">{selectedRule.rule_text}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-white/60 text-sm mb-1">字段</div>
                  <span className={`inline-block px-2 py-1 rounded text-xs ${fieldColors[selectedRule.field] || 'bg-gray-500/20 text-gray-400'}`}>
                    {fieldLabels[selectedRule.field] || selectedRule.field}
                  </span>
                </div>
                <div>
                  <div className="text-white/60 text-sm mb-1">来源</div>
                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                    selectedRule.source === 'auto'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {selectedRule.source === 'auto' ? '自动学习' : '人工确认'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-white/60 text-sm mb-1">状态</div>
                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                    selectedRule.status === 'active'
                      ? 'bg-green-500/20 text-green-400'
                      : selectedRule.status === 'learning'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {selectedRule.status === 'active' ? '活跃' : selectedRule.status === 'learning' ? '学习中' : '已禁用'}
                  </span>
                </div>
                <div>
                  <div className="text-white/60 text-sm mb-1">创建时间</div>
                  <div className="text-white text-sm">{formatDate(selectedRule.created_at)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-white/60 text-sm mb-1">纠正次数</div>
                  <div className="text-white text-sm">{selectedRule.correction_count}/3次</div>
                </div>
                <div>
                  <div className="text-white/60 text-sm mb-1">触发次数</div>
                  <div className="text-white text-sm">{selectedRule.occurrence_count}</div>
                </div>
              </div>
              {selectedRule.trigger_pattern && (
                <div>
                  <div className="text-white/60 text-sm mb-1">触发模式</div>
                  <div className="text-white/80 text-sm">{selectedRule.trigger_pattern}</div>
                </div>
              )}
              {selectedRule.target_value && (
                <div>
                  <div className="text-white/60 text-sm mb-1">目标值</div>
                  <div className="text-white/80 text-sm">{selectedRule.target_value}</div>
                </div>
              )}
              {selectedRule.activated_at && (
                <div>
                  <div className="text-white/60 text-sm mb-1">激活时间</div>
                  <div className="text-white text-sm">{formatDateTime(selectedRule.activated_at)}</div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[#262626] flex justify-end gap-3">
              <button
                onClick={() => setSelectedRule(null)}
                className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-white rounded-lg text-sm transition-colors"
              >
                关闭
              </button>
              {selectedRule.status === 'active' ? (
                <button
                  onClick={() => {
                    handleStatusChange(selectedRule.id, 'disabled')
                    setSelectedRule(null)
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-colors"
                >
                  禁用规则
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleStatusChange(selectedRule.id, 'active')
                    setSelectedRule(null)
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm transition-colors"
                >
                  启用规则
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
