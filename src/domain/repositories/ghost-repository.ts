import { Message } from 'whatsapp-web.js'

export interface GhostRepository{
  checkGhost: (message: Message) => Promise<void>
}
