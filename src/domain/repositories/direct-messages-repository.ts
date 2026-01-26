export interface SaveDirectMessageData {
  chatExternalId: string
  chatName?: string
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

export interface DirectMessagesRepository {
  saveDirectMessage: (data: SaveDirectMessageData) => Promise<void>
}
