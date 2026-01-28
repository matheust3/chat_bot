import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { createWhatsAppCode } from '../../../lib/whatsappVerification'
import Redis from 'ioredis'

interface ResponseBody {
  success?: boolean
  error?: string
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

  const redis = new Redis(redisUrl)
  try {
    await redis.publish('whatsapp.send_code', JSON.stringify({
      phone: entry.phone,
      code: entry.code
    }))
  } catch (err) {
    res.status(500).json({ error: 'Falha ao enviar o código pelo bot.' })
    return
  } finally {
    await redis.quit()
  }

  res.status(200).json({ success: true })
}
