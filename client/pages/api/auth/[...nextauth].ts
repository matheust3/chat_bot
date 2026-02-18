import NextAuth, { NextAuthOptions } from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import nodemailer from 'nodemailer'

interface ExtendedSession {
  user?: {
    id?: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

const databaseUrl = process.env.DATABASE_URL

if (databaseUrl == null || databaseUrl === '') {
  throw new Error('DATABASE_URL is not set')
}

const pool = new Pool({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD
        }
      },
      from: process.env.EMAIL_FROM,
      // Para desenvolvimento, você pode personalizar o email aqui
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        const { host } = new URL(url)
        const transport = nodemailer.createTransport(provider.server)
        await transport.sendMail({
          to: identifier,
          from: provider.from,
          subject: `Login para ${host}`,
          text: `Clique no link para fazer login: ${url}`,
          html: `<p>Clique no link abaixo para fazer login:</p><p><a href="${url}">Login</a></p>`
        })

        // Em desenvolvimento, apenas log o link no console
        console.log('\n\n=================================')
        console.log('🔐 Link de login mágico:')
        console.log(url)
        console.log('=================================\n\n')

        // Em produção, você usaria o nodemailer para enviar o email real
        // const nodemailer = require('nodemailer')
        // const transport = nodemailer.createTransport(provider.server)
        // await transport.sendMail({
        //   to: identifier,
        //   from: provider.from,
        //   subject: `Login para ${host}`,
        //   text: `Clique no link para fazer login: ${url}`,
        //   html: `<p>Clique no link abaixo para fazer login:</p><p><a href="${url}">Login</a></p>`
        // })
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/',
    verifyRequest: '/auth/verify-request'
  },
  callbacks: {
    async jwt ({ token, user }) {
      if (user != null) {
        token.id = user.id
      }
      return token
    },
    async session ({ session, token }) {
      const extendedSession = session as ExtendedSession
      if (extendedSession.user != null) {
        extendedSession.user.id = token.id as string
      }
      return session
    }
  }
}

export default NextAuth(authOptions)
