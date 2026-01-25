import { GroupMessagesRepository } from '../../domain/repositories/group-messages-repository'
import { GroupMessagesRepositoryImpl } from '../../data/repositories/group-messages-repository-impl'
import { PrismaGroupMessagesDatasource } from '../../infra/prisma-group-messages-datasource'
import { PrismaClientInstance } from '../../infra/prisma-client'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class Singleton {
  private static instance: GroupMessagesRepository

  constructor () {
    if (Singleton.instance === undefined) {
      const datasource = new PrismaGroupMessagesDatasource(PrismaClientInstance)
      Singleton.instance = new GroupMessagesRepositoryImpl(datasource)
    }
    return Singleton.instance
  }

  static getInstance (): GroupMessagesRepository {
    if (Singleton.instance === undefined) {
      // eslint-disable-next-line no-new
      new Singleton()
    }
    return Singleton.instance
  }
}

export const GroupMessagesRepositoryInstance = Singleton.getInstance()
