import Head from 'next/head'
import Link from 'next/link'
import { ReactElement, useState, FormEvent, useEffect } from 'react'
import countryCodes from '../data/countryCodes.json'
import { useSession, signIn, signOut } from 'next-auth/react'

export default function Home (): ReactElement {
  const { data: session, status } = useSession()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [countryCode, setCountryCode] = useState('+55')
  const [phone, setPhone] = useState('')
  const [whatsAppCode, setWhatsAppCode] = useState('')
  const [whatsAppStep, setWhatsAppStep] = useState<'input' | 'code' | 'verified'>('input')
  const [whatsappLid, setWhatsappLid] = useState<string | null>(null)
  const [whatsAppError, setWhatsAppError] = useState('')
  const [whatsAppLoading, setWhatsAppLoading] = useState(false)
  const [unlinkLoading, setUnlinkLoading] = useState(false)
  const [showUnlinkModal, setShowUnlinkModal] = useState(false)

  useEffect(() => {
    if (session?.user?.email == null) {
      return
    }

    let cancelled = false

    const loadWhatsAppStatus = async (): Promise<void> => {
      try {
        const response = await fetch('/api/whatsapp/status')
        if (!response.ok) {
          return
        }
        const data = await response.json() as { phone?: string | null }
        if (!cancelled && data.phone != null && data.phone !== '') {
          if (data.phone.startsWith('+')) {
            const match = data.phone.match(/^\+(\d{1,3})(\d+)$/)
            if (match != null) {
              setCountryCode(`+${match[1]}`)
              setPhone(match[2])
            } else {
              setPhone(data.phone)
            }
          } else {
            setPhone(data.phone)
          }
          setWhatsAppStep('verified')
        }
      } catch (err) {
        // ignore
      }
    }

    void loadWhatsAppStatus()

    return () => {
      cancelled = true
    }
  }, [session?.user?.email])

  const handleUnlinkWhatsApp = async (): Promise<void> => {
    setUnlinkLoading(true)
    try {
      const response = await fetch('/api/whatsapp/unlink', {
        method: 'POST'
      })
      if (response.ok) {
        setWhatsAppStep('input')
        setWhatsAppCode('')
        setWhatsAppError('')
        setPhone('')
        setShowUnlinkModal(false)
      }
    } finally {
      setUnlinkLoading(false)
    }
  }

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

  const handleRequestWhatsAppCode = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setWhatsAppError('')
    setWhatsAppLoading(true)

    try {
      const result = await fetch('/api/whatsapp/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session?.user?.email ?? '',
          phone: `${countryCode}${phone}`
        })
      })

      const data = await result.json() as { error?: string, lid?: string | null }

      if (!result.ok) {
        setWhatsAppError(data.error ?? 'Erro ao enviar o código do WhatsApp.')
      } else {
        setWhatsappLid(data.lid ?? null)
        setWhatsAppStep('code')
      }
    } catch (err) {
      setWhatsAppError('Erro ao enviar o código do WhatsApp.')
    }

    setWhatsAppLoading(false)
  }

  const handleVerifyWhatsAppCode = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setWhatsAppError('')
    setWhatsAppLoading(true)

    try {
      const result = await fetch('/api/whatsapp/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session?.user?.email ?? '',
          phone: `${countryCode}${phone}`,
          code: whatsAppCode,
          lid: whatsappLid
        })
      })

      const data = await result.json() as { error?: string }

      if (!result.ok) {
        setWhatsAppError(data.error ?? 'Código inválido ou expirado.')
      } else {
        setWhatsAppStep('verified')
      }
    } catch (err) {
      setWhatsAppError('Erro ao validar o código do WhatsApp.')
    }

    setWhatsAppLoading(false)
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
      <main style={{
        minHeight: '100vh',
        padding: '40px 20px',
        fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)'
      }}>
        {(session == null)
          ? (
          <div style={{
            maxWidth: '520px',
            margin: '0 auto',
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700
              }}>
                S
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '22px' }}>Bem-vindo ao seu SaaS</h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                  Entre rapidamente com um link mágico
                </p>
              </div>
            </div>

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
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
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
                    padding: '12px 20px',
                    backgroundColor: loading ? '#cbd5e1' : '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '15px',
                    fontWeight: 600
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
                backgroundColor: '#eef2ff',
                borderRadius: '12px',
                border: '1px solid #c7d2fe'
              }}>
                <h3 style={{ marginTop: 0, color: '#3730a3' }}>✉️ Email enviado!</h3>
                <p>Enviamos um link de login para <strong>{email}</strong></p>
                <p style={{ fontSize: '14px', color: '#475569' }}>
                  Verifique sua caixa de entrada e clique no link para entrar.
                </p>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: 0 }}>
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
                    color: '#4f46e5',
                    border: '1px solid #4f46e5',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Usar outro email
                </button>
              </div>
                )}

            <div style={{ marginTop: '16px', fontSize: '12px', color: '#64748b' }}>
              Sem senha necessária. Enviaremos um link seguro para o seu email.
            </div>
          </div>
            )
          : (
          <div>
            <div style={{
              maxWidth: '720px',
              margin: '0 auto',
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)'
            }}>
              <h1 style={{ marginTop: 0, fontSize: '24px' }}>Dashboard</h1>
              <p style={{ marginTop: '6px', color: '#475569' }}>
                Bem-vindo, {session.user?.name ?? session.user?.email ?? 'Usuário'}!
              </p>
              <p style={{ color: '#64748b', marginBottom: '20px' }}>
                Você está autenticado no seu painel de controle SaaS.
              </p>
            {whatsAppStep === 'verified'
              ? (
              <>
                <div style={{
                  marginTop: '24px',
                  padding: '16px',
                  backgroundColor: '#eef2ff',
                  borderRadius: '10px',
                  border: '1px solid #c7d2fe',
                  maxWidth: '480px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div>
                    <h3 style={{ marginTop: 0, marginBottom: '6px' }}>Memórias importantes</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                      Gerencie o que o assistente deve lembrar.
                    </p>
                  </div>
                  <Link
                    href="/memories"
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#4f46e5',
                      color: 'white',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  >
                    Abrir
                  </Link>
                </div>
                <div style={{
                  marginTop: '30px',
                  padding: '20px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  maxWidth: '480px'
                }}>
                  <h3 style={{ marginTop: 0 }}>Vínculo WhatsApp</h3>
                  <p style={{ fontSize: '14px', color: '#475569' }}>
                    Seu número já está vinculado.
                  </p>
                  <div style={{ display: 'grid', gap: '10px', fontSize: '14px', color: '#334155' }}>
                    <div>
                      <strong>Email:</strong> {session.user?.email ?? 'Não informado'}
                    </div>
                    <div>
                      <strong>WhatsApp:</strong> {countryCode}{phone}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowUnlinkModal(true) }}
                    disabled={unlinkLoading}
                    style={{
                      marginTop: '16px',
                      width: '100%',
                      padding: '10px 20px',
                      backgroundColor: unlinkLoading ? '#e2e8f0' : '#ef4444',
                      color: unlinkLoading ? '#64748b' : 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: unlinkLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Desvincular
                  </button>
                </div>
                <div style={{
                  marginTop: '24px',
                  padding: '20px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  maxWidth: '480px'
                }}>
                  <h3 style={{ marginTop: 0 }}>Grupos vinculados ao bot</h3>
                  <p style={{ fontSize: '14px', color: '#64748b' }}>
                    Em breve listaremos aqui os grupos que você participa.
                  </p>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {['Grupo de Vendas', 'Time Produto', 'Atendimento VIP'].map((group) => (
                      <div
                        key={group}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: '1px dashed #cbd5e1',
                          backgroundColor: 'white',
                          color: '#94a3b8',
                          fontSize: '14px'
                        }}
                      >
                        {group}
                      </div>
                    ))}
                  </div>
                </div>
              </>
                )
              : (
              <div style={{
                marginTop: '30px',
                padding: '20px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                maxWidth: '480px'
              }}>
                <h3 style={{ marginTop: 0 }}>Vincular WhatsApp</h3>
                <p style={{ fontSize: '14px', color: '#475569' }}>
                  Informe seu número do WhatsApp para receber um código de confirmação.
                </p>

                {whatsAppStep === 'input' && (
                  <form onSubmit={(e) => { void handleRequestWhatsAppCode(e) }}>
                    <div style={{ marginBottom: '12px' }}>
                      <label htmlFor="whatsapp" style={{ display: 'block', marginBottom: '5px' }}>
                        Número do WhatsApp
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                          id="whatsapp-country"
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          style={{
                            width: '140px',
                            padding: '10px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '5px',
                            fontSize: '14px',
                            backgroundColor: 'white'
                          }}
                        >
                          {countryCodes.map((country) => (
                            <option key={`${country.code}-${country.name}`} value={country.code}>
                              {country.code} ({country.name})
                            </option>
                          ))}
                        </select>
                        <input
                          id="whatsapp"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          placeholder="11 99999-9999"
                          style={{
                            flex: 1,
                            padding: '10px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '5px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <p style={{ marginTop: '6px', marginBottom: 0, fontSize: '12px', color: '#64748b' }}>
                        Selecione o país e digite o número sem o código.
                      </p>
                    </div>
                    {whatsAppError !== '' && (
                      <div style={{ color: '#f3004d', marginBottom: '12px', fontSize: '14px' }}>
                        {whatsAppError}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={whatsAppLoading}
                      style={{
                        width: '100%',
                        padding: '10px 20px',
                        backgroundColor: whatsAppLoading ? '#cbd5e1' : '#16a34a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: whatsAppLoading ? 'not-allowed' : 'pointer',
                        fontSize: '15px'
                      }}
                    >
                      {whatsAppLoading ? 'Enviando...' : 'Enviar código'}
                    </button>
                  </form>
                )}

                {whatsAppStep === 'code' && (
                  <form onSubmit={(e) => { void handleVerifyWhatsAppCode(e) }}>
                    <div style={{ marginBottom: '12px' }}>
                      <label htmlFor="whatsapp-code" style={{ display: 'block', marginBottom: '5px' }}>
                        Código recebido:
                      </label>
                      <input
                        id="whatsapp-code"
                        type="text"
                        value={whatsAppCode}
                        onChange={(e) => setWhatsAppCode(e.target.value)}
                        required
                        placeholder="000000"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '5px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    {whatsAppError !== '' && (
                      <div style={{ color: '#f3004d', marginBottom: '12px', fontSize: '14px' }}>
                        {whatsAppError}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={whatsAppLoading}
                      style={{
                        width: '100%',
                        padding: '10px 20px',
                        backgroundColor: whatsAppLoading ? '#cbd5e1' : '#0ea5e9',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: whatsAppLoading ? 'not-allowed' : 'pointer',
                        fontSize: '15px'
                      }}
                    >
                      {whatsAppLoading ? 'Validando...' : 'Confirmar código'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWhatsAppStep('input')
                        setWhatsAppCode('')
                        setPhone('')
                      }}
                      style={{
                        marginTop: '10px',
                        width: '100%',
                        padding: '8px 16px',
                        backgroundColor: 'white',
                        color: '#0ea5e9',
                        border: '1px solid #0ea5e9',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Usar outro número
                    </button>
                  </form>
                )}
              </div>
                )}
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
            {showUnlinkModal && (
              <div style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50
              }}>
                <div style={{
                  width: '100%',
                  maxWidth: '420px',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 20px 40px rgba(15, 23, 42, 0.2)'
                }}>
                  <h3 style={{ marginTop: 0 }}>Desvincular WhatsApp</h3>
                  <p style={{ color: '#475569', fontSize: '14px' }}>
                    Tem certeza que deseja desvincular o número <strong>{countryCode}{phone}</strong>?
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button
                      type="button"
                      onClick={() => { setShowUnlinkModal(false) }}
                      disabled={unlinkLoading}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        backgroundColor: 'white',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: '#334155',
                        cursor: unlinkLoading ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => { void handleUnlinkWhatsApp() }}
                      disabled={unlinkLoading}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        backgroundColor: unlinkLoading ? '#e2e8f0' : '#ef4444',
                        border: 'none',
                        borderRadius: '8px',
                        color: unlinkLoading ? '#64748b' : 'white',
                        cursor: unlinkLoading ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {unlinkLoading ? 'Desvinculando...' : 'Confirmar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
            )}
      </main>
    </>
  )
}
