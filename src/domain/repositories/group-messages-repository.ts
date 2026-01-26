export interface SaveGroupMessageData {
  groupExternalId: string
  groupName?: string
  messageExternalId?: string
  senderId?: string
  senderName?: string
  content: string
  sentAt: Date
  fromMe?: boolean
  isAudio?: boolean
  originalAudioTranscription?: string
  isImage?: boolean
  isVideo?: boolean
  mediaDescription?: string
}

export interface GroupMessageSummaryItem {
  senderId?: string
  senderName?: string
  content: string
  sentAt: Date
  fromMe: boolean
}

export interface GroupMessagesRepository {
  saveGroupMessage: (data: SaveGroupMessageData) => Promise<void>
  getRecentGroupMessages: (groupExternalId: string, limit: number) => Promise<GroupMessageSummaryItem[]>
  getMessagesSince: (groupExternalId: string, after: Date | null, limit: number) => Promise<GroupMessageSummaryItem[]>
  countMessagesSince: (groupExternalId: string, after: Date | null) => Promise<number>
}
