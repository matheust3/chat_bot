import { AddChatToAuthorizedChatsDatasource } from '../../data/datasources/database/add-chat-to-authorized-chats-datasource'
import * as fs from 'fs'

export class AddChatToAuthorizedChatsFileDatasource implements AddChatToAuthorizedChatsDatasource {
  async addChat (chatId: string): Promise<void> {
    if (!fs.existsSync(`${__dirname}/../../../database-files`)) {
      fs.mkdirSync(`${__dirname}/../../../database-files`)
      fs.writeFileSync(`${__dirname}/../../../database-files/authorized-chats.json`, JSON.stringify([chatId]), { encoding: 'utf-8' })
    } else {
      if (fs.existsSync(`${__dirname}/../../../database-files/authorized-chats.json`)) {
        const data: string[] = JSON.parse(fs.readFileSync(`${__dirname}/../../../database-files/authorized-chats.json`, { encoding: 'utf-8' }))
        data.push(chatId)
        fs.writeFileSync(`${__dirname}/../../../database-files/authorized-chats.json`, JSON.stringify(data), { encoding: 'utf-8' })
      } else {
        fs.writeFileSync(`${__dirname}/../../../database-files/authorized-chats.json`, JSON.stringify([chatId]), { encoding: 'utf-8' })
      }
    }
  }
}
