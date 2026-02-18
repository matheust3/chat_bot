import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { PrismaClientInstance } from '../../../lib/prisma'

interface MemoryItem {
  id: string
  content: string
  createdAt: string
}

interface ResponseBody {
  items?: MemoryItem[]
  error?: string
}

export default async function handler (req: NextApiRequest, res: NextApiResponse<ResponseBody>): Promise<void> {
  const session = await getServerSession(req, res, authOptions)
  const sessionEmail = session?.user?.email

  if (sessionEmail == null || sessionEmail === '') {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const user = await PrismaClientInstance.user.findUnique({
    where: { email: sessionEmail },
    select: { id: true }
  })

  if (user?.id == null) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  const scopedUserId = `whatsapp:${user.id}`

  if (req.method === 'GET') {
    const rows = await PrismaClientInstance.$queryRaw<MemoryItem[]>`
      SELECT id, content, created_at AS "createdAt"
      FROM ai_memory
      WHERE user_id = ${scopedUserId} AND kind = 'important'
      ORDER BY created_at DESC
      LIMIT 200
    `

    res.status(200).json({ items: rows })
    return
  }

  if (req.method === 'DELETE') {
    const id = String(req.query.id ?? '').trim()
    if (id === '') {
      res.status(400).json({ error: 'Id inválido.' })
      return
    }

    await PrismaClientInstance.$executeRaw`
      DELETE FROM ai_memory
      WHERE id = ${id} AND user_id = ${scopedUserId} AND kind = 'important'
    `

    res.status(200).json({ items: [] })
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}