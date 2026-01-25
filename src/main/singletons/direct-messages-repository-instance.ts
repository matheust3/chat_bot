import { DirectMessagesRepository } from '../../domain/repositories/direct-messages-repository'
import { DirectMessagesRepositoryImpl } from '../../data/repositories/direct-messages-repository-impl'
import { PrismaDirectMessagesDatasource } from '../../infra/prisma-direct-messages-datasource'
import { PrismaClientInstance } from '../../infra/prisma-client'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class Singleton {
  private static instance: DirectMessagesRepository

  constructor () {
    if (Singleton.instance === undefined) {
      const datasource = new PrismaDirectMessagesDatasource(PrismaClientInstance)
      Singleton.instance = new DirectMessagesRepositoryImpl(datasource)
    }
    return Singleton.instance
  }

  static getInstance (): DirectMessagesRepository {
    if (Singleton.instance === undefined) {
      // eslint-disable-next-line no-new
      new Singleton()
    }
    return Singleton.instance
  }
}

export const DirectMessagesRepositoryInstance = Singleton.getInstance()
