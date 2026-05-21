'use client'
import { useState, useEffect } from 'react'
import { Package, Search, RefreshCw, ChevronRight } from 'lucide-react'

interface Product {
  product_uuid: string
  brand: string
  category: string
  model_std: string
  source_file: string
  is_trap: number
}

interface ProductsResponse {
  products: Product[]
  total: number
  page: number
  page_size: number
}

export default function ProductsPage() {
  const [data, setData] = useState<ProductsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 50

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
      if (searchQuery) params.set('model', searchQuery)
      const res = await fetch(`/api/v1/products?${params}`)
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [page, searchQuery])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">商品管理</h1>
          <p className="text-sm text-[#a1a1a1] mt-1">标准化商品目录，共 {data?.total?.toLocaleString() ?? '--'} 条</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#262626] text-white px-4 py-2 rounded-lg border border-[#262626] text-sm">
          <RefreshCw className="w-4 h-4" /> 刷新
        </button>
      </div>

      <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] overflow-hidden">
        <div className="p-4 border-b border-[#262626]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="搜索型号..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
              className="w-full bg-[#0d0d0d] text-white text-sm rounded-lg pl-10 pr-4 py-2 border border-[#262626] focus:border-[#3b82f6] outline-none"
            />
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#262626]">
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">UUID</th>
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">品牌</th>
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">品类</th>
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">标准型号</th>
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">来源文件</th>
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">陷阱</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-[#666]">加载中...</td></tr>
            ) : (data?.products || []).length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-[#666]">暂无数据</td></tr>
            ) : (data?.products || []).map(p => (
              <tr key={p.product_uuid} className="border-b border-[#262626] hover:bg-[#1f1f1f]">
                <td className="px-6 py-4 font-mono text-xs text-[#666]">{p.product_uuid.slice(0, 8)}...</td>
                <td className="px-6 py-4 text-white font-medium">{p.brand}</td>
                <td className="px-6 py-4 text-[#a1a1a1]">{p.category}</td>
                <td className="px-6 py-4 text-[#a1a1a1] font-mono text-sm">{p.model_std}</td>
                <td className="px-6 py-4 text-[#666] text-xs truncate max-w-[200px]">{p.source_file}</td>
                <td className="px-6 py-4">
                  {p.is_trap ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">陷阱</span>
                  ) : (
                    <span className="text-xs text-[#666]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.total > pageSize && (
          <div className="px-6 py-4 border-t border-[#262626] flex items-center justify-between">
            <div className="text-sm text-[#666]">
              第 {page} 页，共 {Math.ceil(data.total / pageSize)} 页
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-[#262626] hover:bg-[#333] disabled:opacity-50 text-white text-sm rounded"
              >上一页</button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(data.total / pageSize)}
                className="px-3 py-1 bg-[#262626] hover:bg-[#333] disabled:opacity-50 text-white text-sm rounded"
              >下一页</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
