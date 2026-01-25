import { GroupMessagesDatasource } from '../data/datasources/group-messages-datasource'
import { SaveGroupMessageData } from '../domain/repositories/group-messages-repository'
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
        fromMe: data.fromMe ?? false
      }
    })
  }
}
