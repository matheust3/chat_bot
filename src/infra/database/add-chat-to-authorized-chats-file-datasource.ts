import { AddChatToAuthorizedChatsDatasource } from '../../data/datasources/database/add-chat-to-authorized-chats-datasource'
import * as fs from 'fs'

export class AddChatToAuthorizedChatsFileDatasource implements AddChatToAuthorizedChatsDatasource {
  async addChat (chatId: string): Promise<void> {
    if (!fs.existsSync('../../../database-files')) {
      fs.mkdirSync('../../../database-files')
      fs.writeFileSync('../../../database-files/authorized-chats.json', JSON.stringify([chatId]), { encoding: 'utf-8' })
    } else {
      if (fs.existsSync('../../../database-files/authorized-chats.json')) {
        const data: string[] = JSON.parse(fs.readFileSync('../../../database-files/authorized-chats.json', { encoding: 'utf-8' }))
        data.push(chatId)
        fs.writeFileSync('../../../database-files/authorized-chats.json', JSON.stringify(data), { encoding: 'utf-8' })
      } else {
        fs.writeFileSync('../../../database-files/authorized-chats.json', JSON.stringify([chatId]), { encoding: 'utf-8' })
      }
    }
  }
}
