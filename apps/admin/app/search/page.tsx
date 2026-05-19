'use client'

import { useState, useCallback } from 'react'

// Types
interface SearchResult {
  brand: string
  model: string
  category: string
  price_min: number
  price_max: number
  warehouse: string
  confidence: number
  freshness: 'REALTIME' | 'VALID' | 'STALE' | 'ARCHIVED'
}

interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
  cached: boolean
  response_time_ms: number
}

// Freshness badge configuration
const freshnessConfig = {
  REALTIME: { label: '实时', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  VALID: { label: '有效', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  STALE: { label: '过期', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  ARCHIVED: { label: '归档', bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
}

// Category mapping
const categoryLabels: Record<string, string> = {
  all: '全部',
  ac: '空调',
  refrigerator: '冰箱',
  washer: '洗衣机',
  tv: '电视',
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [total, setTotal] = useState(0)
  const [cached, setCached] = useState(false)
  const [responseTime, setResponseTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const performSearch = useCallback(async (searchQuery: string, searchCategory: string) => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: '20',
      })

      if (searchCategory !== 'all') {
        params.append('category', searchCategory)
      }

      const response = await fetch(`http://localhost:8001/search?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Search service unavailable')
      }

      const data: SearchResponse = await response.json()

      setResults(data.results)
      setTotal(data.total)
      setCached(data.cached)
      setResponseTime(data.response_time_ms)
      setSearched(true)
    } catch (err) {
      setError('搜索服务暂时不可用，请稍后重试')
      setSearched(true)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearch = useCallback(() => {
    performSearch(query, category)
  }, [query, category, performSearch])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        performSearch(query, category)
      }
    },
    [query, category, performSearch]
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header + Search Bar */}
      <div className="pt-16 pb-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <h1 className="text-3xl font-bold text-center mb-8 text-white">
            AI 采购助手
          </h1>

          {/* Search Bar */}
          <div className="flex gap-3 items-center">
            {/* Search Input */}
            <div className="flex-1 relative">
              {/* Left Search Icon */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="搜索品牌、型号或品类..."
                className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg text-white text-lg pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Category Dropdown */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-[#1a1a1a] border border-[#262626] rounded-lg text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="all">全部</option>
              <option value="ac">空调</option>
              <option value="refrigerator">冰箱</option>
              <option value="washer">洗衣机</option>
              <option value="tv">电视</option>
            </select>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              搜索
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-[#1a1a1a] rounded-xl h-32 animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
              <p className="text-red-400 text-lg">{error}</p>
            </div>
          )}

          {/* Empty State - Before first search */}
          {!loading && !searched && !error && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-gray-400 text-xl">
                输入品牌、型号或品类关键词开始搜索
              </p>
            </div>
          )}

          {/* No Results State */}
          {!loading && searched && results !== null && results.length === 0 && !error && (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📭</div>
              <h2 className="text-2xl font-bold text-white mb-6">未找到匹配结果</h2>
              <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 inline-block">
                <p className="text-gray-400 mb-2">试试以下建议：</p>
                <ul className="text-gray-300 space-y-2 text-left">
                  <li className="flex items-center gap-2">
                    <span className="text-gray-500">•</span>
                    尝试更宽泛的关键词
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-gray-500">•</span>
                    检查品类筛选是否过严
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-gray-500">•</span>
                    尝试品牌名而非具体型号
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Results Info Bar */}
          {!loading && searched && results !== null && results.length > 0 && (
            <>
              <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
                <span className="text-gray-300">
                  找到 <span className="text-white font-bold">{total}</span> 条结果 (
                  <span className="text-gray-500">{responseTime}ms</span>)
                </span>

                {/* Cache Badge */}
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    cached
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                  }`}
                >
                  {cached ? '已缓存' : '未缓存'}
                </span>

                {/* Query Display */}
                <span className="text-gray-500">
                  当前查询: <span className="text-gray-300">"{query}"</span>
                </span>
              </div>

              {/* Results Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((item, index) => {
                  const freshness = freshnessConfig[item.freshness] || freshnessConfig.VALID

                  return (
                    <div
                      key={`${item.brand}-${item.model}-${index}`}
                      className="bg-[#141414] border border-[#262626] rounded-xl p-5 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all cursor-pointer"
                    >
                      {/* Top Row: Brand + Model + Freshness Badge */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-white">{item.brand}</h3>
                          <p className="text-lg text-gray-300">{item.model}</p>
                        </div>

                        {/* Freshness Badge */}
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border ${freshness.bg} ${freshness.text} ${freshness.border}`}
                        >
                          {freshness.label}
                        </span>
                      </div>

                      {/* Middle Row: Category + Price Range */}
                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#262626]">
                        <span className="text-gray-400 text-sm">
                          {categoryLabels[item.category] || item.category}
                        </span>
                        <span className="text-green-400 font-bold">
                          ¥{item.price_min.toLocaleString('zh-CN')} - ¥{item.price_max.toLocaleString('zh-CN')}
                        </span>
                      </div>

                      {/* Bottom Row: Warehouse + Confidence */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-sm">{item.warehouse}</span>

                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            <span className="text-gray-400">可信度</span>{' '}
                            <span
                              className={`font-medium ${
                                item.confidence >= 80
                                  ? 'text-green-400'
                                  : item.confidence >= 60
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {item.confidence}%
                            </span>
                          </span>

                          {/* Mini Progress Bar */}
                          <div className="w-16 h-1.5 bg-[#262626] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                item.confidence >= 80
                                  ? 'bg-green-400'
                                  : item.confidence >= 60
                                  ? 'bg-yellow-400'
                                  : 'bg-red-400'
                              }`}
                              style={{ width: `${item.confidence}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
