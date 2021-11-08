import { AddChatToAuthorizedChatsDatasource } from '../../data/datasources/database/add-chat-to-authorized-chats-datasource'
import * as fs from 'fs'
import path from 'path'

export class AddChatToAuthorizedChatsFileDatasource implements AddChatToAuthorizedChatsDatasource {
  async addChat (chatId: string): Promise<void> {
    if (!fs.existsSync(path.join(__dirname, '/../../../database-files'))) {
      fs.mkdirSync(path.join(__dirname, '/../../../database-files'))
      fs.writeFileSync(path.join(__dirname, '/../../../database-files/authorized-chats.json'), JSON.stringify([chatId]), { encoding: 'utf-8' })
    } else {
      if (fs.existsSync(path.join(__dirname, '/../../../database-files/authorized-chats.json'))) {
        const data: string[] = JSON.parse(fs.readFileSync(path.join(__dirname, '/../../../database-files/authorized-chats.json'), { encoding: 'utf-8' }))
        if (!data.includes(chatId)) {
          data.push(chatId)
          fs.writeFileSync(path.join(__dirname, '/../../../database-files/authorized-chats.json'), JSON.stringify(data), { encoding: 'utf-8' })
        } else {
          throw Error('Has already been authorized')
        }
      } else {
        fs.writeFileSync(path.join(__dirname, '/../../../database-files/authorized-chats.json'), JSON.stringify([chatId]), { encoding: 'utf-8' })
      }
    }
  }
}
