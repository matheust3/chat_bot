import { DirectMessagesDatasource } from '../data/datasources/direct-messages-datasource'
import { SaveDirectMessageData } from '../domain/repositories/direct-messages-repository'
import { PrismaClient } from '@prisma/client'

export class PrismaDirectMessagesDatasource implements DirectMessagesDatasource {
  private readonly prisma: PrismaClient

  constructor (prisma: PrismaClient) {
    this.prisma = prisma
  }

  async saveDirectMessage (data: SaveDirectMessageData): Promise<void> {
    const chat = await this.prisma.directChat.upsert({
      where: { externalId: data.chatExternalId },
      update: {
        name: data.chatName ?? undefined
      },
      create: {
        externalId: data.chatExternalId,
        name: data.chatName
      }
    })

    await this.prisma.directMessage.create({
      data: {
        chatId: chat.id,
        externalId: data.messageExternalId,
        senderId: data.senderId,
        senderName: data.senderName,
        content: data.content,
        sentAt: data.sentAt,
        fromMe: data.fromMe ?? false
      }
    })
  }
}
