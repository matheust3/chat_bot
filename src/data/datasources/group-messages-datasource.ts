import { GroupMessageSummaryItem, SaveGroupMessageData } from '../../domain/repositories/group-messages-repository'

export interface GroupMessagesDatasource {
  saveGroupMessage: (data: SaveGroupMessageData) => Promise<void>
  getRecentGroupMessages: (groupExternalId: string, limit: number) => Promise<GroupMessageSummaryItem[]>
  getMessagesSince: (groupExternalId: string, after: Date | null, limit: number) => Promise<GroupMessageSummaryItem[]>
  countMessagesSince: (groupExternalId: string, after: Date | null) => Promise<number>
}
