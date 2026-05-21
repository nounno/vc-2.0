'use client'
import { useState, useEffect } from 'react'
import { Package, Search, RefreshCw } from 'lucide-react'

interface CategoryPriceBand {
  category: string
  price_min: number
  price_max: number
  price_avg: number
  price_p25: number
  price_p75: number
  sample_count: number
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryPriceBand[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/categories/price-bands')
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const filtered = categories.filter(c =>
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">品类管理</h1>
          <p className="text-sm text-[#a1a1a1] mt-1">查看各品类价格区间与样本量</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#262626] text-white px-4 py-2 rounded-lg border border-[#262626] text-sm">
          <RefreshCw className="w-4 h-4" /> 刷新
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-5">
          <div className="text-sm text-[#a1a1a1] mb-2">品类总数</div>
          <div className="text-3xl font-bold text-white">{categories.length}</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-5">
          <div className="text-sm text-[#a1a1a1] mb-2">样本量最大的品类</div>
          <div className="text-lg font-bold text-white truncate">
            {categories[0]?.category ?? '--'}
          </div>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-5">
          <div className="text-sm text-[#a1a1a1] mb-2">平均价格区间宽度</div>
          <div className="text-3xl font-bold text-white">
            {categories.length > 0
              ? Math.round(categories.reduce((s, c) => s + (c.price_max - c.price_min), 0) / categories.length).toLocaleString()
              : '--'}
          </div>
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] overflow-hidden">
        <div className="p-4 border-b border-[#262626]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="搜索品类..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d0d0d] text-white text-sm rounded-lg pl-10 pr-4 py-2 border border-[#262626] focus:border-[#3b82f6] outline-none"
            />
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#262626]">
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">品类</th>
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">最低价</th>
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">最高价</th>
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">均价</th>
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">P25</th>
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">P75</th>
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">样本量</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-[#666]">加载中...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-[#666]">暂无数据</td></tr>
            ) : filtered.map(c => (
              <tr key={c.category} className="border-b border-[#262626] hover:bg-[#1f1f1f]">
                <td className="px-6 py-4 text-white font-medium">{c.category}</td>
                <td className="px-6 py-4 text-[#a1a1a1]">¥{c.price_min.toLocaleString()}</td>
                <td className="px-6 py-4 text-[#a1a1a1]">¥{c.price_max.toLocaleString()}</td>
                <td className="px-6 py-4 text-[#a1a1a1]">¥{c.price_avg.toLocaleString()}</td>
                <td className="px-6 py-4 text-[#a1a1a1]">¥{c.price_p25.toLocaleString()}</td>
                <td className="px-6 py-4 text-[#a1a1a1]">¥{c.price_p75.toLocaleString()}</td>
                <td className="px-6 py-4 text-[#a1a1a1]">{c.sample_count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
