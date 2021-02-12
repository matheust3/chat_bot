import { Message } from 'venom-bot'

export interface WhatsMessage extends Message{
  caption: string
  quotedMsg: {type: string}
  fromMe: boolean
}
