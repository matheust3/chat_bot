import Head from 'next/head'
import { ReactElement, useState, FormEvent } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'

export default function Home (): ReactElement {
  const { data: session, status } = useSession()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('email', {
        redirect: false,
        email
      })

      if ((result?.error ?? '') !== '') {
        setError('Erro ao enviar o email. Tente novamente.')
      } else {
        setSubmitted(true)
      }
    } catch (err) {
      setError('Erro ao enviar o email. Tente novamente.')
    }

    setLoading(false)
  }

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Carregando...</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>SaaS Dashboard</title>
        <meta name="description" content="Plataforma SaaS para gerenciar suas funcionalidades" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        {(session == null)
          ? (
          <div style={{ maxWidth: '400px', margin: '0 auto', marginTop: '100px' }}>
            <h1>Bem-vindo ao SaaS</h1>
            <p>Faça login para acessar suas funcionalidades</p>

            {!submitted
              ? (
              <form onSubmit={(e) => { void handleSubmit(e) }} style={{ marginTop: '20px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>
                    Email:
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="seu@email.com"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ccc',
                      borderRadius: '5px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                {error !== '' && (
                  <div style={{ color: '#f3004d', marginBottom: '15px', fontSize: '14px' }}>
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '10px 20px',
                    backgroundColor: loading ? '#ccc' : '#0070f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '16px'
                  }}
                >
                  {loading ? 'Enviando...' : 'Enviar código de login'}
                </button>
              </form>
                )
              : (
              <div style={{
                marginTop: '20px',
                padding: '20px',
                backgroundColor: '#e6f7ff',
                borderRadius: '5px',
                border: '1px solid #91d5ff'
              }}>
                <h3 style={{ marginTop: 0, color: '#0050b3' }}>✉️ Email enviado!</h3>
                <p>Enviamos um link de login para <strong>{email}</strong></p>
                <p style={{ fontSize: '14px', color: '#666' }}>
                  Verifique sua caixa de entrada e clique no link para fazer login.
                </p>
                <p style={{ fontSize: '12px', color: '#999', marginBottom: 0 }}>
                  Em desenvolvimento, o link aparece no console do terminal.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false)
                    setEmail('')
                  }}
                  style={{
                    marginTop: '15px',
                    padding: '8px 16px',
                    backgroundColor: 'white',
                    color: '#0070f3',
                    border: '1px solid #0070f3',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Usar outro email
                </button>
              </div>
                )}

            <p style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
              Sem senha necessária! Você receberá um link mágico por email.
            </p>
          </div>
            )
          : (
          <div>
            <h1>Dashboard</h1>
            <p>Bem-vindo, {session.user?.name ?? session.user?.email ?? 'Usuário'}!</p>
            <p>Você está autenticado no seu painel de controle SaaS</p>
            <button
              onClick={() => { void signOut() }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f3004d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                marginTop: '20px'
              }}
            >
              Logout
            </button>
          </div>
            )}
      </main>
    </>
  )
}
