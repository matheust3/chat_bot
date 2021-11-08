import { Message } from 'whatsapp-web.js'
import { AntiSpamRepository } from '../../domain/repositories/anti-spam-repository'
import { AntiFloodDatasource } from '../datasources/anti-flood-datasource'

export class AntiSpamRepositoryImpl implements AntiSpamRepository {
  constructor (private readonly _antiFloodDatasource: AntiFloodDatasource) {}

  async checkMessage (message: Message): Promise<boolean> {
    const contact = await message.getContact()
    return await this._antiFloodDatasource.checkIfIsFlood(contact.id._serialized)
  }
}
