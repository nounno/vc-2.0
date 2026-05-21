'use client'
import { useState, useEffect } from 'react'
import { BookOpen, TrendingUp, Search, ChevronRight, RefreshCw } from 'lucide-react'

interface Brand {
  brand: string
  record_count: number
  avg_price: number
  share_pct: number
}

interface BrandSummary {
  total_brands: number
  top_brands: { brand: string; count: number }[]
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [summary, setSummary] = useState<BrandSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [qualityRes] = await Promise.all([
        fetch('/api/v1/suppliers/quality'),
      ])
      if (qualityRes.ok) {
        const data = await qualityRes.json()
        // Flatten brands from all suppliers
        const allBrands: Record<string, Brand> = {}
        for (const s of data.suppliers || []) {
          if (s.total_brands) {
            // suppliers/quality doesn't return per-brand data
            // Fall back to supplier brand list
          }
        }
        setSummary({ total_brands: data.suppliers?.length || 0, top_brands: [] })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const filtered = brands.filter(b =>
    b.brand.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">品牌管理</h1>
          <p className="text-sm text-[#a1a1a1] mt-1">查看所有品牌统计数据与分布</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#262626] text-white px-4 py-2 rounded-lg border border-[#262626] text-sm">
          <RefreshCw className="w-4 h-4" /> 刷新
        </button>
      </div>

      <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-6 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#141414] rounded-xl p-5 border border-[#262626]">
            <div className="text-sm text-[#a1a1a1] mb-2">品牌总数</div>
            <div className="text-3xl font-bold text-white">{summary?.total_brands ?? '--'}</div>
          </div>
        </div>
      </div>

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
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">记录数</th>
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">平均价格</th>
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">占比</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-[#666]">加载中...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-[#666]">暂无数据</td></tr>
            ) : filtered.map(b => (
              <tr key={b.brand} className="border-b border-[#262626] hover:bg-[#1f1f1f]">
                <td className="px-6 py-4 text-white font-medium">{b.brand}</td>
                <td className="px-6 py-4 text-[#a1a1a1]">{b.record_count.toLocaleString()}</td>
                <td className="px-6 py-4 text-[#a1a1a1]">¥{b.avg_price.toLocaleString()}</td>
                <td className="px-6 py-4 text-[#a1a1a1]">{b.share_pct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
