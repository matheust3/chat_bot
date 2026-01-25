import { GroupMessageSummaryItem, SaveGroupMessageData } from '../../domain/repositories/group-messages-repository'

export interface GroupMessagesDatasource {
  saveGroupMessage: (data: SaveGroupMessageData) => Promise<void>
  getRecentGroupMessages: (groupExternalId: string, limit: number) => Promise<GroupMessageSummaryItem[]>
}
