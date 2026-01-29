import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { verifyWhatsAppCode } from '../../../lib/whatsappVerification'
import { PrismaClientInstance } from '../../../lib/prisma'

interface ResponseBody {
  verified?: boolean
  error?: string
}

interface RequestBody {
  email?: string
  phone?: string
  code?: string
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

  const { email, phone, code } = req.body as RequestBody
  const normalizedEmail = (email ?? '').trim().toLowerCase()
  const normalizedPhone = (phone ?? '').replace(/\s+/g, '')
  const normalizedCode = (code ?? '').trim()

  if (normalizedEmail === '' || normalizedPhone === '' || normalizedCode === '') {
    res.status(400).json({ error: 'Email, telefone e código são obrigatórios.' })
    return
  }

  if (normalizedEmail !== (sessionEmail ?? '').trim().toLowerCase()) {
    res.status(403).json({ error: 'Email não corresponde ao usuário autenticado.' })
    return
  }

  const verified = verifyWhatsAppCode(normalizedEmail, normalizedPhone, normalizedCode)

  if (!verified) {
    res.status(400).json({ error: 'Código inválido ou expirado.' })
    return
  }

  await PrismaClientInstance.user.updateMany({
    where: {
      whatsappNumber: normalizedPhone,
      email: { not: normalizedEmail }
    },
    data: {
      whatsappNumber: null,
      whatsappVerifiedAt: null
    }
  })

  await PrismaClientInstance.user.update({
    where: { email: normalizedEmail },
    data: {
      whatsappNumber: normalizedPhone,
      whatsappVerifiedAt: new Date()
    }
  })

  res.status(200).json({ verified: true })
}
