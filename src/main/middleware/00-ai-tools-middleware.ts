import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'
import { ToolsAiAgent } from '../../data/services/tools-ai-agent.js'
import { PrismaClientInstance } from '../../infra/prisma-client'

const aiAgent = new ToolsAiAgent('whatsapp')

const normalizeWhatsAppId = (sender: string): string => {
  const digits = sender.replace(/\D/g, '')
  return digits === '' ? '' : `+${digits}`
}

export default async (message: IMessage, client: IClient, next: () => void): Promise<void> => {
  if (message.fromMe || message.isCommand || message.groupId !== undefined) {
    next()
    return
  }

  const body = message.body?.trim() ?? ''
  if (body === '') {
    next()
    return
  }

  const senderId = message.sender?.trim() ?? ''
  const senderPhone = message.senderPhone?.trim() ?? ''
  const chatId = message.chatId?.trim() ?? ''
  const fromId = message.from?.trim() ?? ''
  const candidate = senderPhone !== ''
    ? senderPhone
    : (senderId !== '' ? senderId : (fromId !== '' ? fromId : chatId))
  const whatsappNumber = normalizeWhatsAppId(candidate)
  if (whatsappNumber === '') {
    console.log('[ai-tools] number not found', { senderPhone, senderId, fromId, chatId })
    await client.sendText(message.chatId, 'Não consegui identificar seu número. Vincule sua conta ao email para usar o agente.')
    return
  }

  const digitsOnly = whatsappNumber.replace(/\D/g, '')
  const withoutPlus = digitsOnly
  const withPlus = digitsOnly === '' ? '' : `+${digitsOnly}`

  const lidVariants: string[] = []
  if (senderId.endsWith('@lid')) {
    lidVariants.push(senderId)
    lidVariants.push(senderId.replace(/@lid$/, '@c.us'))
  } else if (senderId.endsWith('@c.us')) {
    lidVariants.push(senderId)
    lidVariants.push(senderId.replace(/@c\.us$/, '@lid'))
  }

  console.log('[ai-tools] lookup', { senderPhone, senderId, fromId, chatId, whatsappNumber, withPlus, withoutPlus, lidVariants })
  const user = await PrismaClientInstance.user.findFirst({
    where: {
      OR: [
        ...lidVariants.map((value) => ({ whatsappLid: value })),
        { whatsappNumber: withPlus },
        { whatsappNumber: withoutPlus },
        { whatsappNumber }
      ]
    },
    select: { id: true, email: true, whatsappLid: true, whatsappNumber: true }
  })
  console.log('[ai-tools] user', { id: user?.id ?? null, email: user?.email ?? null })

  const email = user?.email ?? ''
  if (email.trim() === '') {
    await client.sendText(message.chatId, 'Vincule sua conta ao email para ter acesso ao agente.')
    return
  }

  const agentUserId = user?.id ?? withPlus

  try {
    const response = await aiAgent.handleMessage(body, agentUserId)
    await client.sendText(message.chatId, response)
  } catch (err) {
    console.error('Erro ao responder com IA:', err)
    await client.sendText(message.chatId, 'Não consegui responder agora. Tente novamente em instantes.')
  }
}
