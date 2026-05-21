'use client'
import { useState, useEffect } from 'react'
import { FileText, RefreshCw } from 'lucide-react'

export default function ColumnsPage() {
  const [loading, setLoading] = useState(true)

  // Columns metadata - in production this would come from an API
  const columnDefs = [
    { field: 'brand', label: '品牌', type: 'string', description: '产品品牌名称', sample: '格力', confidence_boost: 0 },
    { field: 'category', label: '品类', type: 'string', description: '产品品类（一级分类）', sample: '空调', confidence_boost: 0 },
    { field: 'model_raw', label: '原始型号', type: 'string', description: '供应商提供的原始型号字符串', sample: 'KFR-35GW/NhAa1BA', confidence_boost: 0 },
    { field: 'model_std', label: '标准型号', type: 'string', description: '标准化后的型号', sample: 'KFR-35GW', confidence_boost: 0 },
    { field: 'price', label: '价格', type: 'number', description: '产品单价（元）', sample: '2999', confidence_boost: 0 },
    { field: 'price_type', label: '价格类型', type: 'string', description: '报价类型：零售/批发/工程', sample: '批发', confidence_boost: 0 },
    { field: 'quality_tier', label: '质量等级', type: 'enum', description: 'HIGH/MEDIUM/LOW', sample: 'HIGH', confidence_boost: 0 },
    { field: 'confidence', label: '置信度', type: 'number', description: '数据质量置信度 0-100', sample: '92.5', confidence_boost: 0 },
    { field: 'error_type', label: '错误类型', type: 'string', description: '识别到的数据类型错误', sample: 'format_mismatch', confidence_boost: 0 },
    { field: 'is_low_quality', label: '低质量标记', type: 'boolean', description: '置信度低于阈值时标记', sample: '0', confidence_boost: 0 },
    { field: 'created_at', label: '创建时间', type: 'datetime', description: '记录创建时间', sample: '2026-01-15T10:30:00Z', confidence_boost: 0 },
  ]

  useEffect(() => { setLoading(false) }, [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">字段管理</h1>
          <p className="text-sm text-[#a1a1a1] mt-1">系统数据字段定义与说明</p>
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-xl border border-[#262626] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#262626]">
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">字段名</th>
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">标签</th>
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">类型</th>
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">说明</th>
              <th className="text-left text-xs font-medium text-[#a1a1a1] px-6 py-3">示例</th>
            </tr>
          </thead>
          <tbody>
            {columnDefs.map(col => (
              <tr key={col.field} className="border-b border-[#262626] hover:bg-[#1f1f1f]">
                <td className="px-6 py-4">
                  <span className="font-mono text-sm text-[#3b82f6]">{col.field}</span>
                </td>
                <td className="px-6 py-4 text-white font-medium">{col.label}</td>
                <td className="px-6 py-4">
                  <span className="text-xs px-2 py-0.5 rounded bg-[#262626] text-[#a1a1a1]">{col.type}</span>
                </td>
                <td className="px-6 py-4 text-sm text-[#a1a1a1]">{col.description}</td>
                <td className="px-6 py-4">
                  <span className="font-mono text-xs text-[#666]">{col.sample}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
