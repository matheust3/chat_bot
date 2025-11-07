import { Message, Whatsapp, Wid } from '@wppconnect-team/wppconnect'
import { ICommand, IMessage } from '../protocols/IMessage'
import { IMessageType } from '../protocols/IMessageType'

interface IOriginQuotedMsg {
  id: {
    _serialized: string
  }
  body: string
  from: string
  type: string
}

export const messageAdapter = async (message: Message & { fromMe?: boolean, caption?: string, quotedMsg?: IOriginQuotedMsg, quotedParticipant: string }, client: Whatsapp): Promise<IMessage> => {
  let groupId: string | undefined
  let command: ICommand | undefined
  let messageType: IMessageType = IMessageType.CHAT
  // Create a closure to maintain the cached quotedMsg
  let cachedQuotedMsg: IMessage | undefined
  let fromAdmin = false
  let senderId = ''

  const body = message.body ?? ''
  const caption = message.caption
  // Check if the message is a command
  if (body.startsWith('#') || message.caption?.startsWith('#') === true) {
    // Get the command without the '#'
    const completeCommand = body.startsWith('#') ? body.slice(1).toLocaleLowerCase() : message.caption?.slice(1).toLocaleLowerCase()
    if (completeCommand !== undefined) {
      const args = completeCommand.split('-')
      // trim the args
      for (let i = 0; i < args.length; i++) {
        args[i] = args[i].trim()
      }
      command = {
        command: args[0],
        args: args.slice(1)
      }
    }
  }

  // Check if the message is from a group
  if (message.isGroupMsg && message.chatId !== undefined) {
    // check if is string
    if (typeof message.chatId === 'string') {
      groupId = message.chatId
    } else {
      groupId = message.chatId._serialized
    }
    // Check if the message is from an admin
    const adminsWid: Wid[] = await client.getGroupAdmins(groupId)
    for (const admin of adminsWid) {
      if (message.sender?.id !== undefined && message.sender?.id !== null) {
        if (admin._serialized === message.sender.id) {
          fromAdmin = true
          break
        }
        const sender = message.sender as unknown as { id: { _serialized: string } }

        if (admin._serialized === sender.id._serialized) {
          fromAdmin = true
          break
        }
      }
    }
  }

  // Check the message type
  for (const key in IMessageType) {
    if (message.type === IMessageType[key]) {
      messageType = IMessageType[key]
    }
  }

  if (typeof message.chatId !== 'string') {
    message.chatId = message.chatId._serialized
  }

  if (typeof message.sender.id !== 'string') {
    const sender = message.sender as unknown as { id: { _serialized: string } }
    senderId = sender.id._serialized ?? ''
  } else {
    senderId = message.sender?.id ?? ''
  }

  return {
    id: message.id,
    body: message.body ?? '',
    command,
    fromMe: message?.fromMe ?? false,
    from: message.from,
    fromAdmin,
    sender: senderId,
    groupId,
    chatId: message.chatId,
    caption,
    isCommand: command !== undefined,
    quotedMsgId: message.quotedMsgId as unknown as string | undefined,
    get quotedMsg (): Promise<IMessage | undefined> {
      return (async () => {
        if (cachedQuotedMsg !== undefined) {
          return cachedQuotedMsg
        }

        if (message.quotedMsgId !== undefined && message.quotedMsgId !== null) {
          try {
            const msg = await client.getMessageById(message.quotedMsgId) as Message & { quotedParticipant: string }
            cachedQuotedMsg = await messageAdapter(msg, client)
            return cachedQuotedMsg
          } catch (error) {
            console.error('Error fetching quoted message:', error)
            return undefined
          }
        } else {
          return undefined
        }
      })()
    },
    type: messageType
  }
}
