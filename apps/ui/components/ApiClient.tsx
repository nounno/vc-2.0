'use client'
import { useEffect, useState, useCallback } from 'react'

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
    const res = await fetch(url.toString(), { credentials: 'include' })
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

  useEffect(() => { fetch_() }, [fetch_])
  return { data, loading, error, refetch: fetch_ }
}
