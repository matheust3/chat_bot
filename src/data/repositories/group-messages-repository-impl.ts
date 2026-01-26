import { GroupMessageSummaryItem, GroupMessagesRepository, SaveGroupMessageData } from '../../domain/repositories/group-messages-repository'
import { GroupMessagesDatasource } from '../datasources/group-messages-datasource'

export class GroupMessagesRepositoryImpl implements GroupMessagesRepository {
  private readonly datasource: GroupMessagesDatasource

  constructor (datasource: GroupMessagesDatasource) {
    this.datasource = datasource
  }

  async saveGroupMessage (data: SaveGroupMessageData): Promise<void> {
    await this.datasource.saveGroupMessage(data)
  }

  async getRecentGroupMessages (groupExternalId: string, limit: number): Promise<GroupMessageSummaryItem[]> {
    return await this.datasource.getRecentGroupMessages(groupExternalId, limit)
  }

  async getMessagesSince (groupExternalId: string, after: Date | null, limit: number): Promise<GroupMessageSummaryItem[]> {
    return await this.datasource.getMessagesSince(groupExternalId, after, limit)
  }

  async countMessagesSince (groupExternalId: string, after: Date | null): Promise<number> {
    return await this.datasource.countMessagesSince(groupExternalId, after)
  }
}
