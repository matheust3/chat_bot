import Head from 'next/head'
import Link from 'next/link'
import { ReactElement } from 'react'

export default function VerifyRequest (): ReactElement {
  return (
    <>
      <Head>
        <title>Verifique seu email - SaaS</title>
        <meta name="description" content="Verifique seu email para fazer login" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', marginTop: '100px', textAlign: 'center' }}>
          <div style={{
            padding: '40px',
            backgroundColor: '#f0f9ff',
            borderRadius: '10px',
            border: '2px solid #bae6fd'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>✉️</div>
            <h1 style={{ color: '#0369a1', marginBottom: '15px' }}>Verifique seu email</h1>
            <p style={{ fontSize: '16px', color: '#475569', lineHeight: '1.6' }}>
              Um link de login foi enviado para seu email.
            </p>
            <p style={{ fontSize: '16px', color: '#475569', lineHeight: '1.6', marginBottom: '25px' }}>
              Clique no link para fazer login automaticamente.
            </p>
            <div style={{
              padding: '15px',
              backgroundColor: '#fef3c7',
              borderRadius: '5px',
              border: '1px solid #fbbf24',
              marginTop: '25px'
            }}>
              <p style={{ fontSize: '14px', color: '#92400e', margin: 0 }}>
                💡 <strong>Modo de desenvolvimento:</strong> O link aparece no console do terminal onde o servidor está rodando.
              </p>
            </div>
          </div>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              marginTop: '25px',
              padding: '10px 20px',
              color: '#0070f3',
              textDecoration: 'none',
              fontSize: '14px'
            }}
          >
            ← Voltar para a página inicial
          </Link>
        </div>
      </main>
    </>
  )
}
