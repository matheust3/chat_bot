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

export const messageAdapter = (message: Message & { fromMe?: boolean, caption?: string, quotedMsg?: IOriginQuotedMsg }): IMessage => {
  let groupId: string | undefined
  let command: ICommand | undefined
  let messageType: IMessageType = IMessageType.CHAT
  let quotedMsg: IQuotedMsg | undefined

  // Check if the message is a command
  if (message.body?.startsWith('#') || message.caption?.startsWith('#') === true) {
    // Get the command without the '#'
    const completeCommand = message.body?.startsWith('#') ? message.body.slice(1).toLocaleLowerCase() : message.caption?.slice(1).toLocaleLowerCase()
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
    groupId = message.chatId
  }

  // Check the message type
  for (const key in IMessageType) {
    if (message.type === IMessageType[key]) {
      messageType = IMessageType[key]
    }
  }

  // Check if the message has a quoted message
  if (message.quotedMsg?.id?._serialized !== undefined) {
    let quotedMsgType = IMessageType.CHAT
    for (const key in IMessageType) {
      if (message.quotedMsg?.type === IMessageType[key]) {
        quotedMsgType = IMessageType[key]
      }
    }

    quotedMsg = {
      id: message.quotedMsg.id._serialized,
      body: message.quotedMsg.body,
      from: message.quotedMsg.from,
      type: quotedMsgType
    }
  }

  return {
    id: message.id,
    body: message.body ?? '',
    command,
    fromMe: message?.fromMe ?? false,
    from: message.from,
    groupId,
    isCommand: command !== undefined,
    quotedMsg,
    type: messageType
  }
}
