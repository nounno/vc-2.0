const API_BASE = '/api/v1'
const PIPELINE_BASE = '/api/v1'

// ============ JWT helpers (cookie-based) ============
interface JwtPayload {
  sub?: string
  role?: string
  supplier_id?: number
  [key: string]: unknown
}

function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload
  } catch {
    return null
  }
}

function getTokenFromCookie(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|;\s*)(vc_session|access_token)=([^;]*)/)
  return match ? decodeURIComponent(match[2]) : ''
}

function getSupplierIdFromCookie(): number | undefined {
  const token = getTokenFromCookie()
  if (!token) return undefined
  const payload = parseJwt(token)
  return payload?.supplier_id
}

// ============ Types ============
export interface TaskResult {
  status: string
  result?: { high_count?: number; medium_count?: number; low_count?: number }
}

export interface QuoteRecord {
  id: number
  supplier_id: number
  supplier_name: string
  brand: string | null
  category: string | null
  model_raw: string | null
  model_std: string | null
  price: number | null
  price_type: string | null
  quality_tier: string
  is_low_quality: number
  confidence: number
  error_type: string | null
  created_at: string
}

export interface QuoteDetail extends QuoteRecord {
  raw_row: Record<string, unknown> | null
}

export interface SupplierProfile {
  id: number
  supplier_code: string
  supplier_name: string
  source_file: string | null
  file_date: string | null
  data_quality_score: number
  parse_success_rate: number
  price_tier: string
  freshness: string
  total_records: number
  total_brands: number
  avg_price: number
  created_at: string
  updated_at: string
}

// ============ API functions (use hook pattern with credentials: 'include') ============

export async function uploadQuoteFile(file: File): Promise<{ task_id: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const supplierId = getSupplierIdFromCookie()
  if (supplierId) {
    formData.append('supplier_id', String(supplierId))
  }
  const response = await fetch(`${PIPELINE_BASE}/pipeline/parse`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  if (!response.ok) throw new Error('文件上传失败')
  return response.json()
}

export async function getTaskResult(task_id: string): Promise<TaskResult> {
  const response = await fetch(`${PIPELINE_BASE}/pipeline/result/${task_id}`, {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('获取任务结果失败')
  return response.json()
}

export async function getQuoteHistory(
  supplier_id?: string,
  quality_tier?: string,
  page: number = 1
): Promise<{ quotes: QuoteRecord[]; total: number }> {
  const params = new URLSearchParams()
  if (supplier_id) params.append('supplier_id', supplier_id)
  if (quality_tier) params.append('quality_tier', quality_tier)
  params.append('page', page.toString())
  params.append('page_size', '10')
  const response = await fetch(`${API_BASE}/quotes?${params.toString()}`, {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('获取报价历史失败')
  return response.json()
}

export async function getQuoteDetail(id: number): Promise<QuoteDetail> {
  const response = await fetch(`${API_BASE}/quotes/${id}`, {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('获取报价详情失败')
  return response.json()
}

export interface SupplierSummary {
  quality_score: number
  total_records: number
  high_count: number
  medium_count: number
  low_count: number
  last_submission?: string
}

export async function getSupplierProfile(): Promise<SupplierProfile> {
  const supplierId = getSupplierIdFromCookie()
  if (!supplierId) throw new Error('获取供应商档案失败')
  const response = await fetch(`${API_BASE}/suppliers/${supplierId}`, {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('获取供应商档案失败')
  return response.json()
}

export async function getSupplierSummary(): Promise<SupplierSummary> {
  const supplierId = getSupplierIdFromCookie()
  if (!supplierId) return { quality_score: 0, total_records: 0, high_count: 0, medium_count: 0, low_count: 0 }
  try {
    const params = new URLSearchParams({ supplier_id: String(supplierId), page: '1', page_size: '200' })
    const response = await fetch(`${API_BASE}/quotes?${params.toString()}`, {
      credentials: 'include',
    })
    if (!response.ok) throw new Error('Failed')
    const data = await response.json()
    const quotes: QuoteRecord[] = data.quotes || []
    const high = quotes.filter((q) => q.quality_tier === 'HIGH').length
    const medium = quotes.filter((q) => q.quality_tier === 'MEDIUM').length
    const low = quotes.filter((q) => q.quality_tier === 'LOW').length
    const avgConf = quotes.length > 0
      ? Math.round(quotes.reduce((sum, q) => sum + q.confidence, 0) / quotes.length)
      : 0
    return {
      quality_score: avgConf,
      total_records: data.total || quotes.length,
      high_count: high,
      medium_count: medium,
      low_count: low,
      last_submission: quotes.length > 0 ? quotes[0].created_at : undefined,
    }
  } catch {
    return { quality_score: 0, total_records: 0, high_count: 0, medium_count: 0, low_count: 0 }
  }
}
