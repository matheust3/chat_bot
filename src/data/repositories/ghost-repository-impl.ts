
import { GroupChat, Message } from 'whatsapp-web.js'
import { GhostRepository } from '../../domain/repositories/ghost-repository'
import { LoadGhostDataDatasource } from '../datasources/load-ghost-data-datasource'
import { SaveGhostDataDatasource } from '../datasources/save-ghost-data-datasource'

export class GhostRepositoryImpl implements GhostRepository {
  private readonly _loadGhostDataDatasource: LoadGhostDataDatasource
  private readonly _saveGhostDataDatasource: SaveGhostDataDatasource

  constructor (loadGhostDataDatasource: LoadGhostDataDatasource,
    saveGhostDataDatasource: SaveGhostDataDatasource) {
    this._loadGhostDataDatasource = loadGhostDataDatasource
    this._saveGhostDataDatasource = saveGhostDataDatasource
  }

  async checkGhost (message: Message): Promise<void> {
    const contact = await message.getContact()
    const chat: GroupChat = await message.getChat() as GroupChat
    if (!message.fromMe && !contact.isMyContact) {
      const ghostData = await this._loadGhostDataDatasource.load()
      const contactId = ghostData.contacts.findIndex((c) => { return c.id === contact.id._serialized })
      const dateNow = Date.now()
      if (contactId !== -1) {
        ghostData.contacts[contactId].lastTimeSeen = dateNow
      } else {
        ghostData.contacts.push({
          id: contact.id._serialized,
          lastTimeSeen: dateNow
        })
      }
      for (let i = 0; i < ghostData.contacts.length; i++) {
        if (ghostData.contacts[i].lastTimeSeen + 5184000000 < dateNow) {
          await chat.sendMessage('Bot message:\n\nRemovido por ghost')
          await chat.removeParticipants([ghostData.contacts[i].id])
          ghostData.contacts.splice(i, 1)
        }
      }
      await this._saveGhostDataDatasource.save(ghostData)
    }
  }
}
