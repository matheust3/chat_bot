import { IMessageType } from './IMessageType'

export interface IMessage {
  readonly body: string
  readonly sender: string
  readonly chatId: string
  readonly caption?: string
  readonly command?: ICommand
  readonly groupId?: string
  readonly from: string
  readonly fromMe: boolean
  readonly fromAdmin: boolean
  readonly isCommand: boolean
  readonly id: string
  readonly quotedMsgId?: string
  readonly type: IMessageType
}

export interface ICommand {
  readonly command: string
  readonly args?: string[]
}
