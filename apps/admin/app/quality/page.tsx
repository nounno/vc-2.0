'use client'
import { useEffect, useState, useCallback } from 'react'
import { 
  AlertTriangle, CheckCircle, XCircle, SkipForward, RefreshCw, 
  ChevronRight, Filter, Search, Eye, Edit3, Scan, Clock, 
  TrendingUp, TrendingDown, Minus, Info, ArrowLeft, FilterX
} from 'lucide-react'

// ============ Types ============
interface LowConfidenceItem {
  id: string
  supplier_name: string
  product_name: string
  field_name: string
  confidence_score: number
  current_value: string
  suggested_value?: string
  evidence?: string[]
  reason?: string
  category?: string
  brand?: string
  price?: number
  created_at: string
}

interface SimilarItem {
  id: string
  supplier_name: string
  product_name: string
  field_name: string
  value: string
  confidence: number
}

interface CorrectionEntry {
  field: string
  original_value: string
  corrected_value: string
  reason: string
}

interface AuditDecision {
  item_id: string
  action: 'approve' | 'correct' | 'reject' | 'skip'
  corrections: CorrectionEntry[]
  notes: string
  timestamp: string
}

// ============ API Base ============
const API_BASE = '/api/v1'

// ============ Utility Functions ============
function getConfidenceColor(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  return 'text-red-400'
}

function getConfidenceBg(score: number): string {
  if (score >= 80) return 'bg-green-500/20'
  if (score >= 60) return 'bg-yellow-500/20'
  return 'bg-red-500/20'
}

function getConfidenceBorder(score: number): string {
  if (score >= 80) return 'border-green-500/30'
  if (score >= 60) return 'border-yellow-500/30'
  return 'border-red-500/30'
}

function getGradeFromScore(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  return 'D'
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-green-500/20 text-green-400 border-green-500/30'
    case 'B': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'C': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case 'D': return 'bg-red-500/20 text-red-400 border-red-500/30'
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}

// Field name translation: API returns English field names, display Chinese
const fieldNameMap: Record<string, string> = {
  'category': '品类',
  'brand': '品牌',
  'price': '价格',
  'quality_tier': '质量层级',
  'power': '功率',
  'model': '型号',
  'model_std': '标准型号',
  'model_raw': '原始型号',
  'error_type': '错误类型',
  'freshness': '数据新鲜度',
}

function translateField(field: string): string {
  return fieldNameMap[field] || field
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

// ============ Main Component ============
export default function QualityAuditPage() {
  // Reasoning data type
  interface ReasoningData {
    quote_id: number
    supplier_name: string
    reasoning: { field: string; value: string; confidence: number; basis: string }[]
    uncertain_fields: { field: string; confidence: number; hint: string }[]
  }

  // Data state
  const [items, setItems] = useState<LowConfidenceItem[]>([])
  const [filteredItems, setFilteredItems] = useState<LowConfidenceItem[]>([])
  const [selectedItem, setSelectedItem] = useState<LowConfidenceItem | null>(null)
  const [reasoningData, setReasoningData] = useState<ReasoningData | null>(null)
  const [similarItems, setSimilarItems] = useState<SimilarItem[]>([])
  const [loadingReasoning, setLoadingReasoning] = useState(false)
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [activeTab, setActiveTab] = useState<'detail' | 'correction' | 'similar'>('detail')
  const [error, setError] = useState<string | null>(null)
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterConfidence, setFilterConfidence] = useState<number | null>(null)
  const [filterSupplier, setFilterSupplier] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'confidence' | 'time' | 'supplier'>('confidence')
  
  // Decision state
  const [corrections, setCorrections] = useState<CorrectionEntry[]>([])
  const [newCorrection, setNewCorrection] = useState<CorrectionEntry>({
    field: '',
    original_value: '',
    corrected_value: '',
    reason: ''
  })
  const [decisionNotes, setDecisionNotes] = useState('')
  const [auditHistory, setAuditHistory] = useState<AuditDecision[]>([])

  // Fetch low confidence items
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/quotes/low-confidence?page=1&page_size=20`)
      if (res.ok) {
        const data = await res.json()
        // Map API response to component's expected field names
        const mapped = (data.quotes || []).map((q: any) => ({
          id: String(q.id),
          supplier_name: q.supplier_name || '',
          product_name: q.model_raw || q.model_std || '',
          field_name: q.error_type || '品类',
          confidence_score: q.confidence || 0,
          current_value: q.model_std || '',
          suggested_value: '',
          evidence: [],
          reason: q.reason || q.error_type || '待审核',
          category: q.category || '',
          brand: q.brand || '',
          price: q.price || 0,
          created_at: q.created_at || new Date().toISOString(),
        }))
        setItems(mapped)
        setFilteredItems(mapped)
      }
    } catch (error) {
      console.error('Failed to fetch low confidence items:', error)
      setError('数据加载失败')
      setItems([])
      setFilteredItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch similar items — real API
  const fetchSimilarItems = useCallback(async (item: LowConfidenceItem) => {
    setLoadingSimilar(true)
    try {
      const res = await fetch(`${API_BASE}/quotes/${item.id}/similar`)
      if (res.ok) {
        const data = await res.json()
        const mapped = (data.matching_quotes || []).map((q: any) => ({
          id: String(q.id),
          supplier_name: q.supplier_name || '',
          product_name: q.model_std || q.model_raw || '',
          field_name: q.error_type || '品类',
          value: String(q.price || ''),
          confidence: q.confidence || 0,
        }))
        setSimilarItems(mapped)
      } else {
        setSimilarItems([])
      }
    } catch (error) {
      console.error('Failed to fetch similar items:', error)
      setSimilarItems([])
    } finally {
      setLoadingSimilar(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Filter and sort items
  useEffect(() => {
    let result = [...items]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(item =>
        item.supplier_name.toLowerCase().includes(query) ||
        item.product_name.toLowerCase().includes(query) ||
        item.field_name.toLowerCase().includes(query)
      )
    }

    // Confidence filter
    if (filterConfidence !== null) {
      result = result.filter(item => item.confidence_score <= filterConfidence)
    }

    // Supplier filter
    if (filterSupplier !== 'all') {
      result = result.filter(item => item.supplier_name === filterSupplier)
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return a.confidence_score - b.confidence_score
        case 'time':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'supplier':
          return a.supplier_name.localeCompare(b.supplier_name)
        default:
          return 0
      }
    })

    setFilteredItems(result)
  }, [items, searchQuery, filterConfidence, filterSupplier, sortBy])

  // Handle item selection — fetch reasoning + similar
  const handleSelectItem = (item: LowConfidenceItem) => {
    setSelectedItem(item)
    setCorrections([])
    setDecisionNotes('')
    setActiveTab('detail')
    // Fetch reasoning
    setLoadingReasoning(true)
    fetch(`${API_BASE}/quotes/${item.id}/reasoning`)
      .then(r => r.json())
      .then(d => setReasoningData(d))
      .catch(() => setReasoningData(null))
      .finally(() => setLoadingReasoning(false))
    // Fetch similar
    fetchSimilarItems(item)
  }

  // Add correction entry
  const handleAddCorrection = () => {
    if (newCorrection.field && newCorrection.corrected_value) {
      setCorrections(prev => [...prev, { ...newCorrection }])
      setNewCorrection({
        field: '',
        original_value: '',
        corrected_value: '',
        reason: ''
      })
    }
  }

  // Remove correction
  const handleRemoveCorrection = (index: number) => {
    setCorrections(prev => prev.filter((_, i) => i !== index))
  }

  // Submit decision — POST corrections to API if action='correct'
  const handleDecision = async (action: 'approve' | 'correct' | 'reject' | 'skip') => {
    if (!selectedItem) return

    // If correct action, POST each correction entry
    if (action === 'correct' && corrections.length > 0) {
      await Promise.all(corrections.map(c =>
        fetch(`${API_BASE}/corrections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity_type: 'quote',
            entity_id: selectedItem.id,
            quote_id: parseInt(selectedItem.id),
            supplier_id: 1,
            field_name: c.field,
            original_value: c.original_value,
            corrected_value: c.corrected_value,
            source: 'manual',
          }),
        })
      ))
    }

    const decision: AuditDecision = {
      item_id: selectedItem.id,
      action,
      corrections: action === 'correct' ? corrections : [],
      notes: decisionNotes,
      timestamp: new Date().toISOString()
    }

    setAuditHistory(prev => [...prev, decision])

    // Move to next item
    const currentIndex = filteredItems.findIndex(i => i.id === selectedItem.id)
    if (currentIndex < filteredItems.length - 1) {
      handleSelectItem(filteredItems[currentIndex + 1])
    } else {
      setSelectedItem(null)
    }
  }

  // Get unique suppliers for filter
  const uniqueSuppliers = Array.from(new Set(items.map(i => i.supplier_name)))

  // Stats
  const lowCount = items.filter(i => i.confidence_score < 50).length
  const mediumCount = items.filter(i => i.confidence_score >= 50 && i.confidence_score < 70).length
  const highCount = items.filter(i => i.confidence_score >= 70).length

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* ========== LEFT PANEL: Low Confidence List ========== */}
      <div className="w-[400px] border-r border-gray-800 flex flex-col bg-[#0d0d0d]">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-white">质量审核台</h1>
            <span className="text-xs text-gray-400">{filteredItems.length} 项</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-red-500/10 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-red-400">{lowCount}</div>
              <div className="text-xs text-gray-400">低置信</div>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-yellow-400">{mediumCount}</div>
              <div className="text-xs text-gray-400">中置信</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-green-400">{highCount}</div>
              <div className="text-xs text-gray-400">高置信</div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center justify-between mb-3">
            <span className="text-red-400 text-xs">{error}</span>
            <button onClick={fetchItems} className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-0.5 rounded transition-colors">重试</button>
          </div>
        )}

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="搜索供应商、产品、字段..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800/50 text-white text-sm rounded-lg pl-10 pr-4 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={filterConfidence !== null ? filterConfidence : ''}
              onChange={(e) => setFilterConfidence(e.target.value ? Number(e.target.value) : null)}
              className="flex-1 bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 border border-gray-700"
            >
              <option value="">全部置信度</option>
              <option value="50">&lt;50%</option>
              <option value="70">&lt;70%</option>
            </select>
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="flex-1 bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 border border-gray-700"
            >
              <option value="all">全部供应商</option>
              {uniqueSuppliers.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="flex-1 bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 border border-gray-700"
            >
              <option value="confidence">按置信度</option>
              <option value="time">按时间</option>
              <option value="supplier">按供应商</option>
            </select>
          </div>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="bg-gray-800/30 rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-400">暂无低置信数据</p>
            </div>
          ) : (
            <div className="p-2">
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className={`w-full text-left p-3 rounded-xl mb-2 transition-all ${
                    selectedItem?.id === item.id 
                      ? 'bg-blue-600/20 border border-blue-500/30' 
                      : 'bg-gray-800/30 border border-transparent hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {item.product_name}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {item.supplier_name}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300`}>
                          {item.field_name}
                        </span>
                        <span className="text-xs text-gray-500 truncate max-w-[120px]">
                          {item.current_value || '暂无'}
                        </span>
                      </div>
                    </div>
                    <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg ${getConfidenceBg(item.confidence_score)} border ${getConfidenceBorder(item.confidence_score)}`}>
                      <span className={`text-lg font-bold ${getConfidenceColor(item.confidence_score)}`}>
                        {item.confidence_score.toFixed(0)}
                      </span>
                      <span className="text-[10px] text-gray-400">%</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========== RIGHT PANEL: Detail View ========== */}
      <div className="flex-1 flex flex-col">
        {selectedItem ? (
          <>
            {/* Detail Header */}
            <div className="p-6 border-b border-gray-800 bg-[#111111]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setSelectedItem(null)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedItem.product_name}</h2>
                    <p className="text-sm text-gray-400 mt-0.5">{selectedItem.supplier_name}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${getConfidenceBg(selectedItem.confidence_score)} border ${getConfidenceBorder(selectedItem.confidence_score)}`}>
                  <span className={`text-2xl font-bold ${getConfidenceColor(selectedItem.confidence_score)}`}>
                    {selectedItem.confidence_score.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-400">% 置信度</span>
                </div>
              </div>

            {/* Quick Action Bar */}
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-800">
              <button
                onClick={() => handleDecision('skip')}
                className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-white text-sm px-3 py-2 rounded-lg transition-colors"
              >
                <SkipForward className="w-4 h-4" /> 跳过
              </button>
              <button
                onClick={() => handleDecision('reject')}
                className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-sm px-3 py-2 rounded-lg transition-colors"
              >
                <XCircle className="w-4 h-4" /> 拒绝
              </button>
              {corrections.length > 0 && (
                <button
                  onClick={() => handleDecision('correct')}
                  className="flex items-center gap-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-3 py-2 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4" /> 修正({corrections.length})
                </button>
              )}
              <button
                onClick={() => handleDecision('approve')}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm px-5 py-2 rounded-lg font-medium transition-colors ml-auto"
              >
                <CheckCircle className="w-4 h-4" /> 通过
              </button>
            </div>

              {/* Tab Navigation */}
              <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1 w-fit">
                <button
                  onClick={() => setActiveTab('detail')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'detail' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Info className="w-4 h-4" />
                  详情
                </button>
                <button
                  onClick={() => setActiveTab('correction')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'correction' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  修正 ({corrections.length})
                </button>
                <button
                  onClick={() => setActiveTab('similar')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'similar' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Scan className="w-4 h-4" />
                  同类扫描
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Detail Tab */}
              {activeTab === 'detail' && (
                <div className="space-y-6">
                  {/* Current Value Card */}
                  <div className="bg-[#111111] rounded-xl p-6 border border-gray-800">
                    <h3 className="text-sm font-medium text-gray-400 mb-4">当前数据</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800/50 rounded-xl p-4">
                        <div className="text-xs text-gray-400 mb-1">字段</div>
                        <div className="text-white font-medium">{selectedItem.field_name}</div>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-4">
                        <div className="text-xs text-gray-400 mb-1">当前值</div>
                        <div className="text-white font-medium">{selectedItem.current_value || '暂无'}</div>
                      </div>
                      {selectedItem.category && (
                        <div className="bg-gray-800/50 rounded-xl p-4">
                          <div className="text-xs text-gray-400 mb-1">分类</div>
                          <div className="text-white font-medium">{selectedItem.category}</div>
                        </div>
                      )}
                      {selectedItem.brand && (
                        <div className="bg-gray-800/50 rounded-xl p-4">
                          <div className="text-xs text-gray-400 mb-1">品牌</div>
                          <div className="text-white font-medium">{selectedItem.brand}</div>
                        </div>
                      )}
                      {selectedItem.price && (
                        <div className="bg-gray-800/50 rounded-xl p-4">
                          <div className="text-xs text-gray-400 mb-1">价格</div>
                          <div className={`font-medium ${selectedItem.price > 100000 ? 'text-red-400' : 'text-white'}`}>
                            ¥{selectedItem.price.toLocaleString()}
                          </div>
                        </div>
                      )}
                      <div className="bg-gray-800/50 rounded-xl p-4">
                        <div className="text-xs text-gray-400 mb-1">发现时间</div>
                        <div className="text-white font-medium">{formatTimeAgo(selectedItem.created_at)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Decision Basis Card — from /quotes/{id}/reasoning */}
                  <div className="bg-[#111111] rounded-xl p-6 border border-gray-800">
                    <h3 className="text-sm font-medium text-gray-400 mb-4">判断依据</h3>

                    {loadingReasoning ? (
                      <div className="text-sm text-gray-500 py-4">加载中...</div>
                    ) : reasoningData ? (
                      <>
                        {/* Uncertain fields — highlighted */}
                        {reasoningData.uncertain_fields && reasoningData.uncertain_fields.length > 0 ? (
                          <div className="mb-4">
                            <div className="text-xs font-medium text-red-400 mb-2 uppercase tracking-wide">⚠ 不确定字段</div>
                            {reasoningData.uncertain_fields.map((uf: any, i: number) => (
                              <div key={i} className="flex items-start gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/30 mb-2">
                                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                                <div>
                                  <div className="text-sm font-medium text-red-300">
                                    {translateField(uf.field)}
                                    <span className="ml-2 text-xs bg-red-500/30 px-1.5 py-0.5 rounded">
                                      {uf.confidence?.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-400 mt-0.5">{uf.hint}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {/* Reasoning per field */}
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">系统推断</div>
                          {reasoningData.reasoning && reasoningData.reasoning.map((r: any, i: number) => (
                            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                              r.confidence < 70
                                ? 'bg-orange-500/10 border-orange-500/30'
                                : 'bg-green-500/10 border-green-500/30'
                            }`}>
                              <Info className={`w-4 h-4 mt-0.5 shrink-0 ${r.confidence < 70 ? 'text-orange-400' : 'text-green-400'}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-medium text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
                                    {translateField(r.field)}
                                  </span>
                                  <span className={`text-xs font-bold ${
                                    r.confidence < 70 ? 'text-orange-400' : 'text-green-400'
                                  }`}>
                                    {r.confidence?.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="text-sm text-gray-200 font-medium">{r.value}</div>
                                <div className="text-xs text-gray-500 mt-0.5 truncate">{r.basis}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500 py-4">暂无判断依据数据</div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="bg-[#111111] rounded-xl p-6 border border-gray-800">
                    <h3 className="text-sm font-medium text-gray-400 mb-4">审核备注</h3>
                    <textarea
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                      placeholder="可选：添加审核备注..."
                      className="w-full bg-gray-800 text-white rounded-xl p-4 border border-gray-700 focus:border-blue-500 focus:outline-none resize-none h-24"
                    />
                  </div>
                </div>
              )}

              {/* Correction Tab */}
              {activeTab === 'correction' && (
                <div className="space-y-6">
                  {/* Add Correction Form */}
                  <div className="bg-[#111111] rounded-xl p-6 border border-gray-800">
                    <h3 className="text-sm font-medium text-gray-400 mb-4">添加修正项</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5">字段名</label>
                        <input
                          type="text"
                          value={newCorrection.field}
                          onChange={(e) => setNewCorrection(prev => ({ ...prev, field: e.target.value }))}
                          placeholder="如: 价格"
                          className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5">原值</label>
                        <input
                          type="text"
                          value={newCorrection.original_value}
                          onChange={(e) => setNewCorrection(prev => ({ ...prev, original_value: e.target.value }))}
                          placeholder={selectedItem.current_value}
                          className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5">修正值</label>
                        <input
                          type="text"
                          value={newCorrection.corrected_value}
                          onChange={(e) => setNewCorrection(prev => ({ ...prev, corrected_value: e.target.value }))}
                          placeholder={selectedItem.suggested_value || '输入修正值'}
                          className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5">修正原因</label>
                        <input
                          type="text"
                          value={newCorrection.reason}
                          onChange={(e) => setNewCorrection(prev => ({ ...prev, reason: e.target.value }))}
                          placeholder="如: 价格偏离市场范围"
                          className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAddCorrection}
                      disabled={!newCorrection.field || !newCorrection.corrected_value}
                      className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      + 添加修正项
                    </button>
                  </div>

                  {/* Correction List */}
                  {corrections.length > 0 ? (
                    <div className="bg-[#111111] rounded-xl p-6 border border-gray-800">
                      <h3 className="text-sm font-medium text-gray-400 mb-4">已添加修正项 ({corrections.length})</h3>
                      <div className="space-y-3">
                        {corrections.map((c, i) => (
                          <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded-xl p-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                  {c.field}
                                </span>
                                <span className="text-gray-400 text-sm">→</span>
                                <span className="text-white font-medium">{c.corrected_value}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {c.original_value && <span className="text-gray-400">原值: {c.original_value}</span>}
                                {c.reason && <span className="ml-2 text-gray-400">原因: {c.reason}</span>}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveCorrection(i)}
                              className="text-gray-500 hover:text-red-400 transition-colors ml-4"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#111111] rounded-xl p-8 border border-gray-800 text-center">
                      <Edit3 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">暂无修正项</p>
                      <p className="text-gray-500 text-xs mt-1">添加修正项后可提交修正</p>
                    </div>
                  )}
                </div>
              )}

              {/* Similar Tab */}
              {activeTab === 'similar' && (
                <div className="space-y-6">
                  {/* Similar Items Table */}
                  <div className="bg-[#111111] rounded-xl border border-gray-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-800">
                      <h3 className="text-sm font-medium text-gray-400">同类数据对比</h3>
                      <p className="text-xs text-gray-500 mt-1">扫描相似产品字段值作为参考</p>
                    </div>
                    
                    {loadingSimilar ? (
                      <div className="p-8 text-center">
                        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">正在扫描...</p>
                      </div>
                    ) : similarItems.length > 0 ? (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-800 bg-gray-800/30">
                            <th className="text-left text-xs font-medium text-gray-400 px-6 py-3">产品</th>
                            <th className="text-left text-xs font-medium text-gray-400 px-6 py-3">供应商</th>
                            <th className="text-left text-xs font-medium text-gray-400 px-6 py-3">字段值</th>
                            <th className="text-left text-xs font-medium text-gray-400 px-6 py-3">置信度</th>
                          </tr>
                        </thead>
                        <tbody>
                          {similarItems.map((item, i) => (
                            <tr key={item.id} className={`border-b border-gray-800/50 ${i === 0 ? 'bg-green-500/5' : ''}`}>
                              <td className="px-6 py-4 text-sm text-white">{item.product_name}</td>
                              <td className="px-6 py-4 text-sm text-gray-400">{item.supplier_name}</td>
                              <td className="px-6 py-4 text-sm text-white font-medium">{item.value}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${getConfidenceBg(item.confidence)}`}
                                      style={{ width: `${item.confidence}%` }}
                                    />
                                  </div>
                                  <span className={`text-sm font-medium ${getConfidenceColor(item.confidence)}`}>
                                    {item.confidence.toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-8 text-center">
                        <Scan className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">未找到同类数据</p>
                      </div>
                    )}
                  </div>

                  {/* Statistics */}
                  {similarItems.length > 0 && (
                    <div className="bg-[#111111] rounded-xl p-6 border border-gray-800">
                      <h3 className="text-sm font-medium text-gray-400 mb-4">统计分析</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-white">
                            {similarItems.reduce((sum, i) => sum + (parseFloat(i.value) || 0), 0) / similarItems.length > 10000 
                              ? '¥' + (similarItems.reduce((sum, i) => sum + (parseFloat(i.value) || 0), 0) / similarItems.length).toFixed(0)
                              : (similarItems.reduce((sum, i) => sum + (parseFloat(i.value) || 0), 0) / similarItems.length).toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">平均{selectedItem.field_name}</div>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-green-400">
                            {Math.max(...similarItems.map(i => i.confidence)).toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-400 mt-1">最高置信度</div>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-blue-400">
                            {similarItems.length}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">相似样本数</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Bar — sticky to viewport bottom */}
            <div className="sticky bottom-0 z-10 p-6 border-t border-gray-800 bg-[#111111]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDecision('skip')}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-xl transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                  跳过
                </button>
                <button
                  onClick={() => handleDecision('reject')}
                  className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-4 py-3 rounded-xl transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  拒绝
                </button>
                {corrections.length > 0 && (
                  <button
                    onClick={() => handleDecision('correct')}
                    className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-3 rounded-xl transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    修正 ({corrections.length})
                  </button>
                )}
                <button
                  onClick={() => handleDecision('approve')}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-colors ml-auto"
                >
                  <CheckCircle className="w-4 h-4" />
                  通过
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Eye className="w-10 h-10 text-gray-600" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">选择审核项</h2>
              <p className="text-gray-400 text-sm">从左侧列表选择低置信数据进行审核</p>
              
              {auditHistory.length > 0 && (
                <div className="mt-8 bg-[#111111] rounded-xl p-4 max-w-sm mx-auto">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">本次审核记录</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {auditHistory.slice(-5).reverse().map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-white truncate max-w-[150px]">{h.item_id}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          h.action === 'approve' ? 'bg-green-500/20 text-green-400' :
                          h.action === 'reject' ? 'bg-red-500/20 text-red-400' :
                          h.action === 'correct' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {h.action === 'approve' ? '通过' : 
                           h.action === 'reject' ? '拒绝' : 
                           h.action === 'correct' ? '修正' : '跳过'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
