import { GroupSummaryCheckpointRepository } from '../../domain/repositories/group-summary-checkpoint-repository'
import { GroupSummaryCheckpointRepositoryImpl } from '../../data/repositories/group-summary-checkpoint-repository-impl'
import { PrismaGroupSummaryCheckpointDatasource } from '../../infra/prisma-group-summary-checkpoint-datasource'
import { PrismaClientInstance } from '../../infra/prisma-client'

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class Singleton {
  private static instance: GroupSummaryCheckpointRepository

  constructor () {
    if (Singleton.instance === undefined) {
      const datasource = new PrismaGroupSummaryCheckpointDatasource(PrismaClientInstance)
      Singleton.instance = new GroupSummaryCheckpointRepositoryImpl(datasource)
    }
    return Singleton.instance
  }

  static getInstance (): GroupSummaryCheckpointRepository {
    if (Singleton.instance === undefined) {
      // eslint-disable-next-line no-new
      new Singleton()
    }
    return Singleton.instance
  }
}

export const GroupSummaryCheckpointRepositoryInstance = Singleton.getInstance()
