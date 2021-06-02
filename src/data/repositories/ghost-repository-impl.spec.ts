import { GhostRepositoryImpl } from './ghost-repository-impl'
import { LoadGhostDataDatasource } from '../datasources/load-ghost-data-datasource'
import { mock, MockProxy } from 'jest-mock-extended'
import { Contact, GroupChat, Message } from 'whatsapp-web.js'
import { SaveGhostDataDatasource } from '../datasources/save-ghost-data-datasource'
import { GhostData } from '../../domain/models/ghost-data'

interface SutTypes{
  repository: GhostRepositoryImpl
  loadGhostDataDatasource: MockProxy<LoadGhostDataDatasource> &LoadGhostDataDatasource
  saveGhostDataDatasource: MockProxy<SaveGhostDataDatasource> & SaveGhostDataDatasource
  message: MockProxy<Message> & Message
  contact: MockProxy<Contact> & Contact
  chat: MockProxy<GroupChat> & GroupChat
}

const makeSut = (): SutTypes => {
  const loadGhostDataDatasource = mock<LoadGhostDataDatasource>()
  const saveGhostDataDatasource = mock<SaveGhostDataDatasource>()
  const chat = mock<GroupChat>()
  const message = mock<Message>()
  const contact = mock<Contact>()

  contact.isMyContact = false
  message.fromMe = false
  contact.id._serialized = 'anyId'
  message.getContact.mockResolvedValue(contact)
  message.getChat.mockResolvedValue(chat)

  loadGhostDataDatasource.load.mockResolvedValue({ contacts: [{ id: 'anyId', lastTimeSeen: 1622600093729 }] })

  const repository = new GhostRepositoryImpl(loadGhostDataDatasource, saveGhostDataDatasource)

  return { repository, loadGhostDataDatasource, contact, message, saveGhostDataDatasource, chat }
}

describe('ghost-repository-impl.spec.ts - checkGhost', () => {
  test('ensure load ghost data if is not me and not my contact', async () => {
    //! Arrange
    const { loadGhostDataDatasource, repository, contact, message } = makeSut()
    contact.isMyContact = false
    message.fromMe = false
    //! Act
    await repository.checkGhost(message)
    //! Assert
    expect(loadGhostDataDatasource.load).toHaveBeenCalledTimes(1)
  })
  test('ensure not load ghost data if is me', async () => {
    //! Arrange
    const { loadGhostDataDatasource, repository, contact, message } = makeSut()
    contact.isMyContact = false
    message.fromMe = true
    //! Act
    await repository.checkGhost(message)
    //! Assert
    expect(loadGhostDataDatasource.load).toHaveBeenCalledTimes(0)
  })
  test('ensure not load ghost data if is my contact', async () => {
    //! Arrange
    const { loadGhostDataDatasource, repository, contact, message } = makeSut()
    contact.isMyContact = true
    message.fromMe = false
    //! Act
    await repository.checkGhost(message)
    //! Assert
    expect(loadGhostDataDatasource.load).toHaveBeenCalledTimes(0)
  })
  test('ensure remove another user if is ghost', async () => {
    //! Arrange
    const { repository, chat, saveGhostDataDatasource, loadGhostDataDatasource, message } = makeSut()
    loadGhostDataDatasource.load.mockResolvedValue({ contacts: [{ id: 'idToRemove', lastTimeSeen: 1622600093729 - 5184000000 - 1 }] })
    Date.now = jest.fn(() => 1622600093799)
    //! Act
    await repository.checkGhost(message)
    //! Assert
    expect(chat.sendMessage).toHaveBeenCalledWith('Bot message:\n\nRemovido por ghost')
    expect(chat.removeParticipants).toHaveBeenCalledWith(['idToRemove'])
    expect(saveGhostDataDatasource.save).toHaveBeenCalledWith(
      {
        contacts: [
          {
            id: 'anyId',
            lastTimeSeen: 1622600093799
          }
        ]
      } as GhostData
    )
  })
  test('ensure update last time seen if user is in list', async () => {
    //! Arrange
    const { repository, chat, saveGhostDataDatasource, message } = makeSut()
    Date.now = jest.fn(() => 1622600093799)
    //! Act
    await repository.checkGhost(message)
    //! Assert
    expect(chat.sendMessage).toHaveBeenCalledTimes(0)
    expect(chat.removeParticipants).toHaveBeenCalledTimes(0)
    expect(saveGhostDataDatasource.save).toHaveBeenCalledWith(
      {
        contacts: [
          {
            id: 'anyId',
            lastTimeSeen: 1622600093799
          }
        ]
      } as GhostData
    )
  })
  test('ensure add user to list if is not in and not update this from existing contact', async () => {
    //! Arrange
    const { repository, chat, contact, saveGhostDataDatasource, message } = makeSut()
    contact.id._serialized = 'another id'
    Date.now = jest.fn(() => 1622600093799)
    //! Act
    await repository.checkGhost(message)
    //! Assert
    expect(chat.sendMessage).toHaveBeenCalledTimes(0)
    expect(chat.removeParticipants).toHaveBeenCalledTimes(0)
    expect(saveGhostDataDatasource.save).toHaveBeenCalledWith(
      {
        contacts: [
          {
            id: 'anyId',
            lastTimeSeen: 1622600093729
          },
          {
            id: 'another id',
            lastTimeSeen: 1622600093799
          }
        ]
      } as GhostData
    )
  })
})
