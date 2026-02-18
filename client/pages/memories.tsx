import Head from 'next/head'
import { ReactElement, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'

interface MemoryItem {
  id: string
  content: string
  createdAt: string
}

export default function Memories (): ReactElement {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [items, setItems] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadMemories = async (): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/memories/important')
      const data = await response.json() as { items?: MemoryItem[], error?: string }
      if (!response.ok) {
        setError(data.error ?? 'Erro ao carregar memórias.')
        return
      }
      setItems(data.items ?? [])
    } catch {
      setError('Erro ao carregar memórias.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status !== 'authenticated') return
    void loadMemories()
  }, [status])

  useEffect(() => {
    if (status === 'unauthenticated') {
      void router.replace('/')
    }
  }, [status, router])

  const handleDelete = async (id: string): Promise<void> => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/memories/important?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id))
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Carregando...</p>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Redirecionando...</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Memórias importantes</title>
      </Head>
      <main style={{
        minHeight: '100vh',
        padding: '40px 20px',
        fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)'
      }}>
        <div style={{
          maxWidth: '720px',
          margin: '0 auto',
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px' }}>Memórias importantes</h1>
              <p style={{ marginTop: '6px', color: '#475569' }}>
                Gerencie as informações que o assistente deve lembrar.
              </p>
            </div>
            <button
              onClick={() => { void loadMemories() }}
              disabled={loading}
              style={{
                padding: '8px 14px',
                backgroundColor: loading ? '#e2e8f0' : '#4f46e5',
                color: loading ? '#64748b' : 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '13px'
              }}
            >
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>

          {error !== '' && (
            <div style={{ marginTop: '16px', color: '#f3004d', fontSize: '14px' }}>{error}</div>
          )}

          {items.length === 0 && !loading && error === '' && (
            <div style={{ marginTop: '20px', color: '#64748b' }}>
              Nenhuma memória importante salva.
            </div>
          )}

          <div style={{ display: 'grid', gap: '12px', marginTop: '20px' }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc'
                }}
              >
                <div style={{ fontSize: '14px', color: '#0f172a' }}>
                  {item.content}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '10px',
                  fontSize: '12px',
                  color: '#64748b'
                }}>
                  <span>{new Date(item.createdAt).toLocaleString('pt-BR')}</span>
                  <button
                    onClick={() => { void handleDelete(item.id) }}
                    disabled={deletingId === item.id}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: deletingId === item.id ? '#e2e8f0' : '#ef4444',
                      color: deletingId === item.id ? '#64748b' : 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: deletingId === item.id ? 'not-allowed' : 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {deletingId === item.id ? 'Removendo...' : 'Apagar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
