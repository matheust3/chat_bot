import { Message } from '@wppconnect-team/wppconnect'
import { ICommand, IMessage } from '../protocols/IMessage'
import { IMessageType } from '../protocols/IMessageType'
import { IQuotedMsg } from '../protocols/IQuotedMsg'

interface IOriginQuotedMsg {
  id: {
    _serialized: string
  }
  body: string
  from: string
  type: string
}

export const messageAdapter = (message: Message & { fromMe?: boolean, caption?: string, quotedMsg?: IOriginQuotedMsg, quotedParticipant: string }): IMessage => {
  let groupId: string | undefined
  let command: ICommand | undefined
  let messageType: IMessageType = IMessageType.CHAT
  let quotedMsg: IQuotedMsg | undefined

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
  }

  // Check the message type
  for (const key in IMessageType) {
    if (message.type === IMessageType[key]) {
      messageType = IMessageType[key]
    }
  }

  // Check if the message has a quoted message
  if (message.quotedMsg !== undefined) {
    console.log('message.quotedMsg', message.quotedMsg)
    if (message.quotedMsg?.id?._serialized === undefined) {
      message.quotedMsg.id = {
        _serialized: message.quotedMsgId as unknown as string
      }
    }

    let quotedMsgType = IMessageType.CHAT
    for (const key in IMessageType) {
      if (message.quotedMsg?.type === IMessageType[key]) {
        quotedMsgType = IMessageType[key]
      }
    }

    quotedMsg = {
      id: message.quotedMsg.id._serialized,
      body: message.quotedMsg.body,
      from: message.quotedParticipant,
      type: quotedMsgType
    }
  }

  if (typeof message.chatId !== 'string') {
    message.chatId = message.chatId._serialized
  }

  return {
    id: message.id,
    body: message.body ?? '',
    command,
    fromMe: message?.fromMe ?? false,
    from: message.from,
    groupId,
    chatId: message.chatId,
    caption,
    isCommand: command !== undefined,
    quotedMsg,
    type: messageType
  }
}
