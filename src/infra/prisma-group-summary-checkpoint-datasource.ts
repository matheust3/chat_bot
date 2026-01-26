import { PrismaClient } from '@prisma/client'
import { GroupSummaryCheckpointDatasource } from '../data/datasources/group-summary-checkpoint-datasource'

export class PrismaGroupSummaryCheckpointDatasource implements GroupSummaryCheckpointDatasource {
  constructor (private readonly prisma: PrismaClient) {}

  async getLastSummarizedAt (groupExternalId: string): Promise<Date | null> {
    const checkpoint = await this.prisma.groupSummaryCheckpoint.findFirst({
      where: {
        group: {
          externalId: groupExternalId
        }
      }
    })

    return checkpoint?.lastSummarizedAt ?? null
  }

  async setLastSummarizedAt (groupExternalId: string, lastSummarizedAt: Date): Promise<void> {
    const group = await this.prisma.group.upsert({
      where: { externalId: groupExternalId },
      update: {},
      create: { externalId: groupExternalId }
    })

    await this.prisma.groupSummaryCheckpoint.upsert({
      where: { groupId: group.id },
      update: { lastSummarizedAt },
      create: {
        groupId: group.id,
        lastSummarizedAt
      }
    })
  }
}
