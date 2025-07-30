'use client'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import axios from 'axios'

export default function SuccessClient() {
  const searchParams = useSearchParams()
  const productId = searchParams.get('productId')
  const [loading, setLoading] = useState(false)

  const download = async () => {
    if (!productId) return
    try {
      setLoading(true)
      const { data } = await axios.get(`/api/download-link?productId=${productId}`)
      if (data.success && data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <button
        onClick={download}
        className="px-6 py-3 bg-blue-600 text-white rounded disabled:opacity-50"
        disabled={loading}
      >
        {loading ? 'Preparing...' : 'Download'}
      </button>
    </div>
  )
}
