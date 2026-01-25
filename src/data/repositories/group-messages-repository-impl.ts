import { GroupMessagesRepository, SaveGroupMessageData } from '../../domain/repositories/group-messages-repository'
import { GroupMessagesDatasource } from '../datasources/group-messages-datasource'

export class GroupMessagesRepositoryImpl implements GroupMessagesRepository {
  private readonly datasource: GroupMessagesDatasource

  constructor (datasource: GroupMessagesDatasource) {
    this.datasource = datasource
  }

  async saveGroupMessage (data: SaveGroupMessageData): Promise<void> {
    await this.datasource.saveGroupMessage(data)
  }
}
