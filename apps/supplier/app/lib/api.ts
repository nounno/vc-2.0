const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8003'
const PIPELINE_BASE = process.env.NEXT_PUBLIC_PIPELINE_BASE || 'http://localhost:8002'

export interface TaskResult {
  status: string
  result?: {
    high_count?: number
    medium_count?: number
    low_count?: number
    records?: Array<{
      row_number: number
      model: string
      brand: string
      error_type?: string
      quality_tier?: string
    }>
  }
}

export interface QuoteRecord {
  id: string
  file_name: string
  submitted_at: string
  quality_tier: string
  record_count: number
  status: string
}

export interface SupplierProfile {
  id: string
  name: string
  contact: string
  email: string
  categories: string[]
  quality_score: number
  last_submission?: string
}

export async function uploadQuoteFile(file: File): Promise<{ task_id: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${PIPELINE_BASE}/pipeline/parse`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('文件上传失败')
  }

  return response.json()
}

export async function getTaskResult(task_id: string): Promise<TaskResult> {
  const response = await fetch(`${PIPELINE_BASE}/pipeline/result/${task_id}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('获取任务结果失败')
  }

  return response.json()
}

export async function getQuoteHistory(
  supplier_id?: string,
  status?: string,
  page: number = 1
): Promise<{ records: QuoteRecord[]; total: number }> {
  const params = new URLSearchParams()
  if (supplier_id) params.append('supplier_id', supplier_id)
  if (status) params.append('status', status)
  params.append('page', page.toString())
  params.append('page_size', '10')

  const response = await fetch(`${API_BASE}/quotes?${params.toString()}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('获取报价历史失败')
  }

  return response.json()
}

export async function getQualityFeedback(
  supplier_id?: string
): Promise<{ records: Array<{ row_number: number; model: string; brand: string; error_type: string; id: string }> }> {
  const params = new URLSearchParams()
  if (supplier_id) params.append('supplier_id', supplier_id)

  const response = await fetch(`${API_BASE}/feedback?${params.toString()}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('获取质量反馈失败')
  }

  return response.json()
}

export async function getSupplierProfile(supplier_id: string): Promise<SupplierProfile> {
  const response = await fetch(`${API_BASE}/suppliers/${supplier_id}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('获取供应商档案失败')
  }

  return response.json()
}

export async function getSupplierSummary(supplier_id?: string): Promise<{
  quality_score: number
  total_records: number
  high_count: number
  medium_count: number
  low_count: number
  last_submission?: string
}> {
  const params = new URLSearchParams()
  if (supplier_id) params.append('supplier_id', supplier_id)

  const response = await fetch(`${API_BASE}/summary?${params.toString()}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('获取汇总信息失败')
  }

  return response.json()
}

export async function resubmitRecord(record_id: string, data: Record<string, string>): Promise<{ task_id: string }> {
  const response = await fetch(`${PIPELINE_BASE}/pipeline/resubmit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ record_id, ...data }),
  })

  if (!response.ok) {
    throw new Error('重新提交失败')
  }

  return response.json()
}
