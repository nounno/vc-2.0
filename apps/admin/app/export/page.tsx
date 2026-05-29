'use client'

import { useState, useEffect } from 'react'
import { Download, FileText, Users, Package, TrendingUp, RefreshCw } from 'lucide-react'

interface ExportCard {
  key: string
  name: string
  description: string
  icon: React.ElementType
  rowCount: number | null
}

interface TableCount {
  [key: string]: number
}

async function fetchTableCounts(): Promise<TableCount> {
  const tables = ['suppliers', 'supplier_quotes', 'std_products', 'rules']
  const counts: TableCount = {}
  
  await Promise.all(
    tables.map(async (table) => {
      try {
        const res = await fetch(`/api/v1/export/${table}/count`)
        if (res.ok) {
          const data = await res.json()
          counts[table] = data.row_count || 0
        }
      } catch {
        counts[table] = 0
      }
    })
  )
  
  return counts
}

async function downloadExport(tableKey: string, format: 'csv' | 'json') {
  try {
    const response = await fetch(`/api/v1/export/${tableKey}?format=${format}&limit=5000`, {
      credentials: 'include',
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: '下载失败' }))
      throw new Error(error.detail || '下载失败')
    }
    
    const blob = await response.blob()
    const contentDisposition = response.headers.get('Content-Disposition')
    const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/)
    const filename = filenameMatch 
      ? filenameMatch[1] 
      : `${tableKey}_export.${format}`
    
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (err) {
    alert(err instanceof Error ? err.message : '下载失败')
  }
}

export default function ExportPage() {
  const [loading, setLoading] = useState(true)
  const [tableCounts, setTableCounts] = useState<TableCount>({})
  const [downloading, setDownloading] = useState<string | null>(null)

  const fetchCounts = async () => {
    setLoading(true)
    try {
      const counts = await fetchTableCounts()
      setTableCounts(counts)
    } catch (err) {
      console.error('Failed to fetch table counts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCounts()
  }, [])

  const handleDownload = async (tableKey: string, format: 'csv' | 'json') => {
    setDownloading(`${tableKey}-${format}`)
    try {
      await downloadExport(tableKey, format)
    } finally {
      setDownloading(null)
    }
  }

  const cards: ExportCard[] = [
    {
      key: 'suppliers',
      name: '供应商数据',
      description: '导出供应商基本信息、文件来源、数据质量评分',
      icon: Users,
      rowCount: tableCounts['suppliers'] ?? null,
    },
    {
      key: 'supplier_quotes',
      name: '报价数据',
      description: '导出所有供应商的报价明细，含品牌、品类、价格',
      icon: FileText,
      rowCount: tableCounts['supplier_quotes'] ?? null,
    },
    {
      key: 'std_products',
      name: '产品数据',
      description: '导出标准产品库，包含品类、品牌、规格信息',
      icon: Package,
      rowCount: tableCounts['std_products'] ?? null,
    },
    {
      key: 'rules',
      name: '规则数据',
      description: '导出价格计算规则、品类规则、字段映射规则',
      icon: TrendingUp,
      rowCount: tableCounts['rules'] ?? null,
    },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">数据导出</h1>
          <p className="text-sm text-[#a1a1a1] mt-1">
            导出各类数据为 CSV 或 JSON 格式 · 最大支持 5000 条记录
          </p>
        </div>
        <button
          onClick={fetchCounts}
          disabled={loading}
          className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#262626] text-white px-4 py-2 rounded-lg border border-[#262626] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-sm">刷新行数</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-4 mb-6">
        <p className="text-sm text-[#a1a1a1]">
          <span className="text-[#3b82f6] font-medium">提示：</span>
          导出数据受权限控制，仅管理员可执行。CSV 格式适合 Excel 打开，JSON 格式适合程序处理。
        </p>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.key}
              className="bg-[#1a1a1a] rounded-xl border border-[#262626] p-5 hover:border-[#3b82f6]/30 transition-colors"
            >
              {/* Card Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-[#3b82f6]/10 rounded-xl flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6 text-[#3b82f6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-1">{card.name}</h3>
                  <p className="text-sm text-[#a1a1a1] line-clamp-2">{card.description}</p>
                </div>
              </div>

              {/* Row Count */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-[#666]">约</span>
                {loading ? (
                  <span className="text-sm text-[#a1a1a1]">加载中...</span>
                ) : (
                  <span className="text-sm font-medium text-[#3b82f6]">
                    {card.rowCount !== null ? card.rowCount.toLocaleString() : '?'} 行
                  </span>
                )}
              </div>

              {/* Download Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleDownload(card.key, 'csv')}
                  disabled={downloading === `${card.key}-csv`}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#262626] hover:bg-[#333] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {downloading === `${card.key}-csv` ? '下载中...' : 'CSV'}
                </button>
                <button
                  onClick={() => handleDownload(card.key, 'json')}
                  disabled={downloading === `${card.key}-json`}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {downloading === `${card.key}-json` ? '下载中...' : 'JSON'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
