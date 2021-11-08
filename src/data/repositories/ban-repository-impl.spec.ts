import { mock, MockProxy } from 'jest-mock-extended'
import { Contact, GroupChat, GroupParticipant, Message } from 'whatsapp-web.js'
import { BanLogsDatasource } from '../datasources/ban-logs-datasource'
import { BanRepositoryImpl } from './ban-repository-impl'

describe('ban-repository-impl.spec.ts - ban', () => {
  let contact: MockProxy<Contact> &Contact
  let message: MockProxy<Message> & Message
  let chat: MockProxy<GroupChat> & GroupChat
  let banLogsDatasource: MockProxy<BanLogsDatasource> & BanLogsDatasource
  let repository: BanRepositoryImpl

  beforeEach(() => {
    banLogsDatasource = mock<BanLogsDatasource>()
    message = mock<Message>()
    chat = mock<GroupChat>()
    contact = mock<Contact>()

    message.hasQuotedMsg = true
    message.getContact.mockResolvedValue(contact)
    message.getChat.mockResolvedValue(chat)
    contact.id._serialized = 'toBan'
    contact.isMe = false
    chat.isGroup = true

    repository = new BanRepositoryImpl(banLogsDatasource)
  })

  test('ensure ban user', async () => {
    //! Arrange
    //! Act
    await repository.ban(message, 'to test')
    //! Assert
    expect(chat.removeParticipants).toHaveBeenCalledWith([contact.id._serialized])
  })

  test('ensure not ban if is me', async () => {
    //! Arrange
    contact.isMe = true
    //! Act
    await repository.ban(message, 'to test')
    //! Assert
    expect(chat.removeParticipants).toHaveBeenCalledTimes(0)
  })

  test('ensure registry ban in database', async () => {
    //! Arrange
    //! Act
    await repository.ban(message, 'to test')
    //! Assert
    expect(banLogsDatasource.registryBan).toHaveBeenCalledWith(contact.id._serialized, 'to test')
  })

  test('ensure not ban if chat is not a group', async () => {
    //! Arrange
    chat.isGroup = false
    //! Act
    await repository.ban(message, 'to test')
    //! Assert
    expect(chat.removeParticipants).toHaveBeenCalledTimes(0)
  })
})
describe('ban-repository-impl.spec.ts - getLogs', () => {
  let contact: MockProxy<Contact> &Contact
  let message: MockProxy<Message> & Message
  let chat: MockProxy<GroupChat> & GroupChat
  let banLogsDatasource: MockProxy<BanLogsDatasource> & BanLogsDatasource
  let repository: BanRepositoryImpl

  beforeEach(() => {
    banLogsDatasource = mock<BanLogsDatasource>()
    message = mock<Message>()
    chat = mock<GroupChat>()
    contact = mock<Contact>()

    message.getChat.mockResolvedValue(chat)
    chat.getContact.mockResolvedValue(contact)
    contact.id._serialized = 'contactId'
    chat.isGroup = false
    banLogsDatasource.getBanLog.mockResolvedValue([{ contactId: 'contactId', log: 'log', date: '23 alguma coisa' }, { contactId: 'contactId', log: 'log2', date: '2 alguma coisa' }])

    repository = new BanRepositoryImpl(banLogsDatasource)
  })
  test('ensure call ban repository with correct params', async () => {
    //! Arrange
    //! Act
    await repository.getLogs(message)
    //! Assert
    expect(banLogsDatasource.getBanLog).toHaveBeenCalledWith(contact.id._serialized)
  })

  test('ensure return limpo if do not have logs', async () => {
    //! Arrange
    banLogsDatasource.getBanLog.mockResolvedValue([])
    //! Act
    await repository.getLogs(message)
    //! Assert
    expect(message.reply).toHaveBeenCalledWith('Limpo! 👊')
  })

  test('ensure return logs if has logs', async () => {
    //! Arrange
    //! Act
    await repository.getLogs(message)
    //! Assert
    expect(message.reply).toHaveBeenCalledWith('date: 23 alguma coisa\nlog: log\n---\ndate: 2 alguma coisa\nlog: log2\n---\n')
  })
})
describe('ban-repository-impl.spec.ts - adminBan', () => {
  let contact: MockProxy<Contact> &Contact
  let contactToBan: MockProxy<Contact> &Contact
  let participant: MockProxy<GroupParticipant> & GroupParticipant
  let message: MockProxy<Message> & Message
  let quotedMsg: MockProxy<Message> & Message
  let chat: MockProxy<GroupChat> & GroupChat
  let banLogsDatasource: MockProxy<BanLogsDatasource> & BanLogsDatasource
  let repository: BanRepositoryImpl

  beforeEach(() => {
    banLogsDatasource = mock<BanLogsDatasource>()
    message = mock<Message>()
    quotedMsg = mock<Message>()
    chat = mock<GroupChat>()
    contact = mock<Contact>()
    contactToBan = mock<Contact>()
    participant = mock<GroupParticipant>()

    message.hasQuotedMsg = true
    message.getContact.mockResolvedValue(contact)
    message.getChat.mockResolvedValue(chat)
    message.getQuotedMessage.mockResolvedValue(quotedMsg)
    contact.id._serialized = 'admin'
    chat.isGroup = true
    chat.participants = [participant]
    participant.id._serialized = 'admin'
    participant.isAdmin = true
    contactToBan.isMe = false
    quotedMsg.getContact.mockResolvedValue(contactToBan)

    repository = new BanRepositoryImpl(banLogsDatasource)
  })

  test('ensure check if command is from a admin', async () => {
    //! Arrange
    //! Act
    await repository.adminBan(message)
    //! Assert
    expect(message.getContact).toHaveBeenCalled()
  })

  test('ensure remove participant', async () => {
    //! Arrange
    //! Act
    await repository.adminBan(message)
    //! Assert
    expect(chat.removeParticipants).toHaveBeenCalledWith([contactToBan.id._serialized])
  })
  test('ensure registry the ban on logs', async () => {
    //! Arrange
    //! Act
    await repository.adminBan(message)
    //! Assert
    expect(banLogsDatasource.registryBan).toHaveBeenCalledWith(contactToBan.id._serialized, 'from admin')
  })
  test('ensure not remove participant is chat is not a group', async () => {
    //! Arrange
    chat.isGroup = false
    //! Act
    await repository.adminBan(message)
    //! Assert
    expect(chat.removeParticipants).toHaveBeenCalledTimes(0)
  })
  test('ensure not remove participant is contact is not a admin', async () => {
    //! Arrange
    participant.isAdmin = false
    //! Act
    await repository.adminBan(message)
    //! Assert
    expect(chat.removeParticipants).toHaveBeenCalledTimes(0)
  })
  test('ensure not remove participant if not has quoted msg', async () => {
    //! Arrange
    message.hasQuotedMsg = false
    //! Act
    await repository.adminBan(message)
    //! Assert
    expect(chat.removeParticipants).toHaveBeenCalledTimes(0)
  })
  test('ensure not ban if is me', async () => {
    //! Arrange
    contactToBan.isMe = true
    //! Act
    await repository.adminBan(message)
    //! Assert
    expect(chat.removeParticipants).toHaveBeenCalledTimes(0)
    expect(message.reply).toHaveBeenCalledWith('🤨')
  })

  test('ensure get chat and contact from message', async () => {
    //! Arrange
    //! Act
    await repository.adminBan(message)
    //! Assert
    expect(message.getChat).toHaveBeenCalled()
  })
})
