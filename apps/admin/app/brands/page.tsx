'use client'
import { useState, useEffect } from 'react'
import { BookOpen, TrendingUp, Search, ChevronRight, RefreshCw } from 'lucide-react'

interface Brand {
  brand: string
  record_count: number
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 50

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/admin/brands')
      if (res.ok) {
        const data = await res.json()
        const brandList = (data.brands || []).map((b: any) => ({
          brand: b.brand,
          record_count: b.product_count,
        }))
        setBrands(brandList)
      }
    } catch (e) {
      setError('数据加载失败')
      setLoading(false)
      return
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const filtered = brands.filter(b =>
    b.brand.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">品牌管理</h1>
          <p className="text-sm text-[#a1a1a1] mt-1">查看各品类商品数量</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#262626] text-white px-4 py-2 rounded-lg border border-[#262626] text-sm">
          <RefreshCw className="w-4 h-4" /> 刷新
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between mb-4">
          <span className="text-red-400 text-sm">{error}</span>
          <button onClick={fetchData} className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1 rounded transition-colors">重试</button>
        </div>
      )}

      <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] overflow-hidden">
        <div className="p-4 border-b border-[#262626]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="搜索品牌..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d0d0d] text-white text-sm rounded-lg pl-10 pr-4 py-2 border border-[#262626] focus:border-[#3b82f6] outline-none"
            />
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#262626]">
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">品牌</th>
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">商品数</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={2} className="px-6 py-8 text-center text-[#666]">加载中...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={2} className="px-6 py-8 text-center text-[#666]">暂无数据</td></tr>
            ) : paginated.map(b => (
              <tr key={b.brand} className="border-b border-[#262626] hover:bg-[#1f1f1f]">
                <td className="px-6 py-4 text-white font-medium">{b.brand}</td>
                <td className="px-6 py-4 text-[#a1a1a1]">{b.record_count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-4 border-t border-[#262626] flex items-center justify-between">
          <span className="text-sm text-[#666]">共 {filtered.length} 条</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-[#262626] hover:bg-[#333] disabled:opacity-50 text-white text-sm rounded"
            >上一页</button>
            <span className="text-sm text-[#a1a1a1]">第 {page} / {Math.ceil(filtered.length / pageSize) || 1} 页</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(filtered.length / pageSize)}
              className="px-3 py-1 bg-[#262626] hover:bg-[#333] disabled:opacity-50 text-white text-sm rounded"
            >下一页</button>
          </div>
        </div>
      </div>
    </div>
  )
}
