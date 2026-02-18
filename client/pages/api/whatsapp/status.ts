import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { PrismaClientInstance } from '../../../lib/prisma'

interface ResponseBody {
  phone?: string | null
  error?: string
}

export default async function handler (req: NextApiRequest, res: NextApiResponse<ResponseBody>): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const session = await getServerSession(req, res, authOptions)
  const sessionEmail = session?.user?.email

  if (sessionEmail == null || sessionEmail === '') {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const user = await PrismaClientInstance.user.findUnique({
    where: { email: sessionEmail },
    select: { whatsappNumber: true }
  })

  res.status(200).json({ phone: user?.whatsappNumber ?? null })
}
