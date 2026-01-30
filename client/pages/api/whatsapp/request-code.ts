import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { createWhatsAppCode } from '../../../lib/whatsappVerification'
import Redis from 'ioredis'
import { randomUUID } from 'node:crypto'

interface ResponseBody {
  success?: boolean
  error?: string
  lid?: string | null
}

interface RequestBody {
  email?: string
  phone?: string
}

const isValidPhone = (phone: string): boolean => {
  return /^\+?\d{10,15}$/.test(phone.replace(/\s+/g, ''))
}

export default async function handler (req: NextApiRequest, res: NextApiResponse<ResponseBody>): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const session = await getServerSession(req, res, authOptions)
  const sessionEmail = session?.user?.email

  if (sessionEmail == null || sessionEmail === '') {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { email, phone } = req.body as RequestBody
  const normalizedEmail = (email ?? '').trim().toLowerCase()
  const normalizedPhone = (phone ?? '').replace(/\s+/g, '')

  if (normalizedEmail === '' || normalizedPhone === '') {
    res.status(400).json({ error: 'Email e telefone são obrigatórios.' })
    return
  }

  if (normalizedEmail !== (sessionEmail ?? '').trim().toLowerCase()) {
    res.status(403).json({ error: 'Email não corresponde ao usuário autenticado.' })
    return
  }

  if (!isValidPhone(normalizedPhone)) {
    res.status(400).json({ error: 'Número de WhatsApp inválido. Use o formato +5511999999999.' })
    return
  }

  const entry = createWhatsAppCode(normalizedEmail, normalizedPhone)

  const redisUrl = process.env.REDIS_URL
  if (redisUrl == null || redisUrl === '') {
    res.status(500).json({ error: 'Redis não configurado.' })
    return
  }

  const requestId = randomUUID()
  const redis = new Redis(redisUrl)
  const subscriber = new Redis(redisUrl)
  const waitForLid = async (): Promise<string | null> => {
    await subscriber.subscribe('whatsapp.code_sent')
    return await new Promise((resolve) => {
      let settled = false
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true
          resolve(null)
        }
      }, 5000)

      subscriber.on('message', (channel, message) => {
        if (channel !== 'whatsapp.code_sent' || settled) return
        try {
          const payload = JSON.parse(message) as { id?: string, lid?: string, phone?: string }
          if (payload.id !== requestId) return
          settled = true
          clearTimeout(timeout)
          resolve(payload.lid ?? null)
        } catch {
          // ignore invalid payloads
        }
      })
    })
  }
  try {
    const lidPromise = waitForLid()
    await redis.publish('whatsapp.send_code', JSON.stringify({
      id: requestId,
      phone: entry.phone,
      code: entry.code
    }))
    const lid = await lidPromise
    res.status(200).json({ success: true, lid })
    return
  } catch (err) {
    res.status(500).json({ error: 'Falha ao enviar o código pelo bot.' })
    return
  } finally {
    await redis.quit()
    await subscriber.quit()
  }
}
