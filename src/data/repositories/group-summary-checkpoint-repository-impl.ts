import { GroupSummaryCheckpointRepository } from '../../domain/repositories/group-summary-checkpoint-repository'
import { GroupSummaryCheckpointDatasource } from '../datasources/group-summary-checkpoint-datasource'

export class GroupSummaryCheckpointRepositoryImpl implements GroupSummaryCheckpointRepository {
  constructor (private readonly datasource: GroupSummaryCheckpointDatasource) {}

  async getLastSummarizedAt (groupExternalId: string): Promise<Date | null> {
    return await this.datasource.getLastSummarizedAt(groupExternalId)
  }

  async setLastSummarizedAt (groupExternalId: string, lastSummarizedAt: Date): Promise<void> {
    await this.datasource.setLastSummarizedAt(groupExternalId, lastSummarizedAt)
  }
}
