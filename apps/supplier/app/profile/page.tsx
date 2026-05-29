'use client'
import { useState, useEffect } from 'react'
import { User, Package, Calendar, TrendingUp, Loader2 } from 'lucide-react'
import { getSupplierProfile, getSupplierSummary, SupplierProfile, SupplierSummary } from '../lib/api'

export default function ProfilePage() {
  const [profile, setProfile] = useState<SupplierProfile | null>(null)
  const [summary, setSummary] = useState<SupplierSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [profileRes, summaryRes] = await Promise.all([
        getSupplierProfile(),
        getSupplierSummary(),
      ])
      setProfile(profileRes)
      setSummary(summaryRes)
    } catch {
      // API failed — show empty state
    }
    setLoading(false)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#3b82f6] animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">供应商档案</h1>
        <p className="text-[#a1a1a1]">查看和完善您的供应商信息及质量评分</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Info */}
        <div className="border border-[#262626] rounded-xl bg-[#111111] p-6">
          <h2 className="text-lg font-semibold text-white mb-6">基本信息</h2>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-[#3b82f6]/20 flex items-center justify-center">
              <User className="w-8 h-8 text-[#3b82f6]" />
            </div>
            <div>
              <h3 className="text-white font-medium text-lg">{profile?.supplier_name}</h3>
              <p className="text-[#666] text-sm">编号: {profile?.supplier_code}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0a0a]">
              <Package className="w-4 h-4 text-[#666]" />
              <div>
                <p className="text-xs text-[#666]">价格带</p>
                <p className="text-white text-sm">{profile?.price_tier || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0a0a]">
              <Calendar className="w-4 h-4 text-[#666]" />
              <div>
                <p className="text-xs text-[#666]">最近更新</p>
                <p className="text-white text-sm">{formatDate(profile?.updated_at)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0a0a]">
              <TrendingUp className="w-4 h-4 text-[#666]" />
              <div>
                <p className="text-xs text-[#666]">数据文件</p>
                <p className="text-white text-sm">{profile?.source_file || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Score */}
        <div className="border border-[#262626] rounded-xl bg-[#111111] p-6">
          <h2 className="text-lg font-semibold text-white mb-6">质量评分</h2>

          {/* Score Circle */}
          <div className="flex justify-center mb-8">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#262626"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke={summary?.quality_score && summary.quality_score >= 80 ? '#22c55e' : summary?.quality_score && summary.quality_score >= 60 ? '#eab308' : '#ef4444'}
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${((summary?.quality_score || 0) / 100) * 351.86} 351.86`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">{summary?.quality_score || 0}</span>
                <span className="text-xs text-[#666]">质量分</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-[#0a0a0a] text-center">
              <p className="text-2xl font-bold text-white">{summary?.total_records || 0}</p>
              <p className="text-xs text-[#666]">总记录数</p>
            </div>
            <div className="p-4 rounded-lg bg-[#0a0a0a] text-center">
              <p className="text-2xl font-bold text-green-500">{summary?.high_count || 0}</p>
              <p className="text-xs text-[#666]">高质量</p>
            </div>
            <div className="p-4 rounded-lg bg-[#0a0a0a] text-center">
              <p className="text-2xl font-bold text-yellow-500">{summary?.medium_count || 0}</p>
              <p className="text-xs text-[#666]">中质量</p>
            </div>
            <div className="p-4 rounded-lg bg-[#0a0a0a] text-center">
              <p className="text-2xl font-bold text-red-500">{summary?.low_count || 0}</p>
              <p className="text-xs text-[#666]">低质量</p>
            </div>
          </div>

          {/* Trend */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#0a0a0a]">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm text-[#a1a1a1]">较上月提升 5%</span>
          </div>
        </div>

        {/* Categories */}
        <div className="border border-[#262626] rounded-xl bg-[#111111] p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-4">数据概览</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-[#0a0a0a] text-center">
              <p className="text-2xl font-bold text-white">{profile?.total_records || 0}</p>
              <p className="text-xs text-[#666]">总记录数</p>
            </div>
            <div className="p-4 rounded-lg bg-[#0a0a0a] text-center">
              <p className="text-2xl font-bold text-white">{profile?.total_brands || 0}</p>
              <p className="text-xs text-[#666]">品牌数</p>
            </div>
            <div className="p-4 rounded-lg bg-[#0a0a0a] text-center">
              <p className="text-2xl font-bold text-white">{profile?.avg_price || 0}</p>
              <p className="text-xs text-[#666]">平均价格</p>
            </div>
            <div className="p-4 rounded-lg bg-[#0a0a0a] text-center">
              <p className="text-2xl font-bold text-white">{profile?.parse_success_rate ? `${profile.parse_success_rate}%` : '-'}</p>
              <p className="text-xs text-[#666]">解析成功率</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
