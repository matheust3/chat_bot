export interface SaveGroupMessageData {
  groupExternalId: string
  groupName?: string
  messageExternalId?: string
  senderId?: string
  senderName?: string
  content: string
  sentAt: Date
  fromMe?: boolean
}

export interface GroupMessagesRepository {
  saveGroupMessage: (data: SaveGroupMessageData) => Promise<void>
}
