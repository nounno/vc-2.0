'use client'
import { useState, useEffect } from 'react'
import { User, Mail, Phone, Package, Calendar, TrendingUp, Loader2 } from 'lucide-react'
import { getSupplierProfile, getSupplierSummary } from '../lib/api'

interface SupplierProfile {
  id: string
  name: string
  contact: string
  email: string
  categories: string[]
  quality_score: number
  last_submission?: string
}

interface SupplierSummary {
  quality_score: number
  total_records: number
  high_count: number
  medium_count: number
  low_count: number
  last_submission?: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<SupplierProfile | null>(null)
  const [summary, setSummary] = useState<SupplierSummary | null>(null)
  const [loading, setLoading] = useState(true)

  // Mock supplier ID for demo - in real app would come from auth
  const supplierId = 'supplier-001'

  useEffect(() => {
    fetchData()
  }, [supplierId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [profileRes, summaryRes] = await Promise.all([
        getSupplierProfile(supplierId),
        getSupplierSummary(supplierId),
      ])
      setProfile(profileRes)
      setSummary(summaryRes)
    } catch {
      // Use mock data for demo
      setProfile({
        id: supplierId,
        name: '深圳华强电子有限公司',
        contact: '张经理',
        email: 'zhang@hqelectronic.com',
        categories: ['手机', '平板电脑', '智能穿戴'],
        quality_score: 87,
        last_submission: new Date(Date.now() - 86400000 * 2).toISOString(),
      })
      setSummary({
        quality_score: 87,
        total_records: 1245,
        high_count: 892,
        medium_count: 298,
        low_count: 55,
        last_submission: new Date(Date.now() - 86400000 * 2).toISOString(),
      })
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
              <h3 className="text-white font-medium text-lg">{profile?.name}</h3>
              <p className="text-[#666] text-sm">供应商ID: {profile?.id}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0a0a]">
              <User className="w-4 h-4 text-[#666]" />
              <div>
                <p className="text-xs text-[#666]">联系人</p>
                <p className="text-white text-sm">{profile?.contact}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0a0a]">
              <Mail className="w-4 h-4 text-[#666]" />
              <div>
                <p className="text-xs text-[#666]">邮箱</p>
                <p className="text-white text-sm">{profile?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0a0a]">
              <Phone className="w-4 h-4 text-[#666]" />
              <div>
                <p className="text-xs text-[#666]">联系电话</p>
                <p className="text-white text-sm">138-****-8888</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0a0a]">
              <Calendar className="w-4 h-4 text-[#666]" />
              <div>
                <p className="text-xs text-[#666]">最近提交</p>
                <p className="text-white text-sm">{formatDate(summary?.last_submission)}</p>
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
          <h2 className="text-lg font-semibold text-white mb-4">经营品类</h2>
          <div className="flex flex-wrap gap-2">
            {profile?.categories?.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30"
              >
                <Package className="w-3 h-3" />
                {cat}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
