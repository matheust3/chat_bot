import { IMessageType } from './IMessageType'

export interface IQuotedMsg {
  id: string
  from: string
  type: IMessageType
  body: string
}
