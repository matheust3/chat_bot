import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

let prismaInstance: PrismaClient | undefined

const createPrismaClient = (): PrismaClient => {
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl === undefined || databaseUrl === '') {
    throw new Error('DATABASE_URL não definida')
  }

  const pool = new Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter })
}

export const PrismaClientInstance = ((): PrismaClient => {
  if (prismaInstance === undefined) {
    prismaInstance = createPrismaClient()
  }
  return prismaInstance
})()
