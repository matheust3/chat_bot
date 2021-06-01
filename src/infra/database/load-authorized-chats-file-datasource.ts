import { LoadAuthorizedChatsDatasource } from '../../data/datasources/database/load-authorized-chats-datasource'
import * as fs from 'fs'

export class LoadAuthorizedChatsFileDatasource implements LoadAuthorizedChatsDatasource {
  load (): string[] {
    if (!fs.existsSync('../../../database-files/authorized-chats.json')) {
      return []
    } else {
      return JSON.parse(fs.readFileSync(`${__dirname}/../../../database-files/authorized-chats.json`, { encoding: 'utf-8' }))
    }
  }
}
