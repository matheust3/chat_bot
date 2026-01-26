import { GroupMessagesDatasource } from '../data/datasources/group-messages-datasource'
import { GroupMessageSummaryItem, SaveGroupMessageData } from '../domain/repositories/group-messages-repository'
import { PrismaClient } from '@prisma/client'

export class PrismaGroupMessagesDatasource implements GroupMessagesDatasource {
  private readonly prisma: PrismaClient

  constructor (prisma: PrismaClient) {
    this.prisma = prisma
  }

  async saveGroupMessage (data: SaveGroupMessageData): Promise<void> {
    const group = await this.prisma.group.upsert({
      where: { externalId: data.groupExternalId },
      update: {
        name: data.groupName ?? undefined
      },
      create: {
        externalId: data.groupExternalId,
        name: data.groupName
      }
    })

    await this.prisma.groupMessage.create({
      data: {
        groupId: group.id,
        externalId: data.messageExternalId,
        senderId: data.senderId,
        senderName: data.senderName,
        content: data.content,
        sentAt: data.sentAt,
        fromMe: data.fromMe ?? false,
        isAudio: data.isAudio ?? false,
        originalAudioTranscription: data.originalAudioTranscription
      }
    })
  }

  async getRecentGroupMessages (groupExternalId: string, limit: number): Promise<GroupMessageSummaryItem[]> {
    const messages = await this.prisma.groupMessage.findMany({
      where: {
        group: {
          externalId: groupExternalId
        }
      },
      orderBy: {
        sentAt: 'desc'
      },
      take: limit,
      select: {
        senderId: true,
        senderName: true,
        content: true,
        sentAt: true,
        fromMe: true
      }
    })

    return messages.map((message) => ({
      senderId: message.senderId ?? undefined,
      senderName: message.senderName ?? undefined,
      content: message.content,
      sentAt: message.sentAt,
      fromMe: message.fromMe
    }))
  }
}
