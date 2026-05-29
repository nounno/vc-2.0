'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ParserJobDetailPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to main parser page (single-page mode, no separate route needed)
    router.replace('/parser')
  }, [router])

  return null
}
