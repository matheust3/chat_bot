import { Message, Whatsapp } from 'venom-bot'

export class ChatBot {
  private readonly _client: Whatsapp

  constructor (client: Whatsapp) {
    this._client = client
  }

  async onAnyMessage (message: Message): Promise<void> {
    console.log(message)
  }
}
