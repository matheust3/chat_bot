import { IMessageType } from './IMessageType'
import { IQuotedMsg } from './IQuotedMsg'

export interface IMessage {
  readonly body: string
  readonly command?: ICommand
  readonly groupId?: string
  readonly from: string
  readonly fromMe: boolean
  readonly isCommand: boolean
  readonly id: string
  readonly quotedMsg?: IQuotedMsg
  readonly type: IMessageType
}

export interface ICommand {
  readonly command: string
  readonly args?: string[]
}
