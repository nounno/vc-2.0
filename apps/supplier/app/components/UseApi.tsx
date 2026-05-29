'use client'
import { useCallback, useEffect, useState } from 'react'

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

// ============ useAuth hook ============
export interface CurrentUser {
  userId: string
  role: string
  supplierId?: number
}

export function useAuth() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getTokenFromCookie()
    if (!token) {
      setLoading(false)
      return
    }
    const payload = parseJwt(token)
    if (payload) {
      setUser({
        userId: payload.sub || '',
        role: payload.role || '',
        supplierId: payload.supplier_id,
      })
    }
    setLoading(false)
  }, [])

  return { user, loading }
}

// ============ useSupplierId hook ============
export function useSupplierId(): number | undefined {
  const { user } = useAuth()
  return user?.supplierId
}

// ============ useApi hook ============
interface UseApiOptions {
  baseUrl?: string
}

export function useApi(options: UseApiOptions = {}) {
  const { baseUrl = '/api/v1' } = options

  async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    const url = new URL(`${baseUrl}${path}`, window.location.origin)
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
    }
    const res = await fetch(url.toString(), {
      credentials: 'include',
    })
    if (!res.ok) throw new Error(`API ${path} 请求失败 (${res.status})`)
    return res.json()
  }

  async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`API ${path} 请求失败 (${res.status})`)
    return res.json()
  }

  async function patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`API ${path} 请求失败 (${res.status})`)
    return res.json()
  }

  return { get, post, patch }
}

// ============ useApiData hook (data fetching with loading state) ============
export function useApiData<T>(path: string, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { get } = useApi()

  const fetch_ = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await get<T>(path)
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [get, path])

  useEffect(() => {
    fetch_()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error, refetch: fetch_ }
}

// ============ useUpload hook (for file uploads with supplier_id) ============
export function useUpload() {
  const supplierId = useSupplierId()
  const PIPELINE_BASE = '/api/v1'

  async function uploadFile(file: File): Promise<{ task_id: string }> {
    const formData = new FormData()
    formData.append('file', file)
    if (supplierId) {
      formData.append('supplier_id', String(supplierId))
    }
    const res = await fetch(`${PIPELINE_BASE}/pipeline/parse`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    if (!res.ok) throw new Error('文件上传失败')
    return res.json()
  }

  return { uploadFile }
}
