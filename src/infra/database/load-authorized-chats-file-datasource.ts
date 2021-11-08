import { LoadAuthorizedChatsDatasource } from '../../data/datasources/database/load-authorized-chats-datasource'
import * as fs from 'fs'
import path from 'path'

export class LoadAuthorizedChatsFileDatasource implements LoadAuthorizedChatsDatasource {
  load (): string[] {
    if (!fs.existsSync(path.join(__dirname, '/../../../database-files/authorized-chats.json'))) {
      return []
    } else {
      return JSON.parse(fs.readFileSync(path.join(__dirname, '/../../../database-files/authorized-chats.json'), { encoding: 'utf-8' }))
    }
  }
}
