import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class PrismaSingleton {
  private static instance: PrismaClient

  static getInstance (): PrismaClient {
    if (PrismaSingleton.instance === undefined) {
      const databaseUrl = process.env.DATABASE_URL
      if (databaseUrl === undefined) {
        throw new Error('DATABASE_URL não definida')
      }

      const pool = new Pool({ connectionString: databaseUrl })
      const adapter = new PrismaPg(pool)

      PrismaSingleton.instance = new PrismaClient({ adapter })
    }
    return PrismaSingleton.instance
  }
}

export const PrismaClientInstance = PrismaSingleton.getInstance()
