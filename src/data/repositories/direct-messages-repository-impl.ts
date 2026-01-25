import { DirectMessagesRepository, SaveDirectMessageData } from '../../domain/repositories/direct-messages-repository'
import { DirectMessagesDatasource } from '../datasources/direct-messages-datasource'

export class DirectMessagesRepositoryImpl implements DirectMessagesRepository {
  private readonly datasource: DirectMessagesDatasource

  constructor (datasource: DirectMessagesDatasource) {
    this.datasource = datasource
  }

  async saveDirectMessage (data: SaveDirectMessageData): Promise<void> {
    await this.datasource.saveDirectMessage(data)
  }
}
