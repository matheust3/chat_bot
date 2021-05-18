import { mock, MockProxy } from 'jest-mock-extended'
import { Contact, GroupChat, Message } from 'whatsapp-web.js'
import { JustWomensRepositoryImpl } from './just-womens-repository-impl'

interface SutTypes {
  groupChat: GroupChat
  contact: Contact
  repository: JustWomensRepositoryImpl
  message: MockProxy<Message> & Message
}

const makeSut = (): SutTypes => {
  const groupChat = mock<GroupChat>()
  groupChat.participants = [{ id: { _serialized: 'contactId', server: null, user: null }, isAdmin: false, isSuperAdmin: false }]
  const contact = mock<Contact>()
  const message = mock<Message>()
  message.getContact.mockResolvedValue(contact)
  message.body = 'test message'
  const repository = new JustWomensRepositoryImpl(5, 10)

  return { groupChat, repository, contact, message }
}

describe('just-womens-repository-impl.spec.ts - onEnjoy', () => {
  test('ensure send a message to new participant', async () => {
    //! Arrange
    const { repository, groupChat, contact } = makeSut()
    //! Act
    await repository.onEnjoy(contact, groupChat)
    //! Assert
    expect(groupChat.sendMessage).toHaveBeenCalledWith(
      'Mensagem do Bot:\nOi, seja bem vinda!\nEnvie sua foto com seu nome e idade na legenda\nSerá banida se nao enviar',
      {
        mentions: [contact]
      }
    )
  })
  test('ensure add user to awaiting confirmation', async () => {
    //! Arrange
    const { repository, contact, groupChat } = makeSut()
    contact.id._serialized = 'contactId'
    Date.now = jest.fn(() => 1487076708000)
    //! Act
    await repository.onEnjoy(contact, groupChat)
    //! Assert
    expect(repository.awaitingConfirmation.get('contactId')).toEqual(
      Date.now() + 60000
    )
  })
})

describe('just-womens-repository-impl.spec.ts - onMessage', () => {
  test('ensure reply message if contact is in awaitingApproveList', async () => {
    //! Arrange
    const { repository, contact, message, groupChat } = makeSut()
    contact.id._serialized = 'contactId'
    repository.awaitingApprove.set('contactId', { approveVotes: 0, banVotes: 0, timeToExpire: null })
    //! Act
    await repository.onMessage(message, groupChat)
    //! Assert
    expect(message.reply).toHaveBeenCalledWith(
      'Ainda não foi aprovada, votos:\nAprovar: 0/5\nBan: 0/5'
    )
  })
})
