import { SaveDirectMessageData } from '../../domain/repositories/direct-messages-repository'

export interface DirectMessagesDatasource {
  saveDirectMessage: (data: SaveDirectMessageData) => Promise<void>
}
