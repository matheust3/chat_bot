import Head from 'next/head'
import { useState, ReactElement } from 'react'

export default function Home (): ReactElement {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  return (
    <>
      <Head>
        <title>SaaS Dashboard</title>
        <meta name="description" content="Plataforma SaaS para gerenciar suas funcionalidades" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        {!isLoggedIn
          ? (
          <div style={{ maxWidth: '400px', margin: '0 auto', marginTop: '100px' }}>
            <h1>Bem-vindo ao SaaS</h1>
            <p>Faça login para acessar suas funcionalidades</p>
            <button
              onClick={() => setIsLoggedIn(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Login
            </button>
          </div>
            )
          : (
          <div>
            <h1>Dashboard</h1>
            <p>Bem-vindo ao seu painel de controle SaaS</p>
            <button
              onClick={() => setIsLoggedIn(false)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f3004d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px'
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
