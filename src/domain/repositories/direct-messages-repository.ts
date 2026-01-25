export interface SaveDirectMessageData {
  chatExternalId: string
  chatName?: string
  messageExternalId?: string
  senderId?: string
  senderName?: string
  content: string
  sentAt: Date
  fromMe?: boolean
}

export interface DirectMessagesRepository {
  saveDirectMessage: (data: SaveDirectMessageData) => Promise<void>
}
