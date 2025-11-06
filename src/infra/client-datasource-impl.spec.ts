import { mock, mockDeep, MockProxy } from 'jest-mock-extended'
import { Client, Chat, GroupChat, GroupParticipant } from 'whatsapp-web.js'
import { ClientDataSourceImpl } from './client-datasource-impl'

interface SutTypes {
  client: MockProxy<Client> & Client
  clientDataSource: ClientDataSourceImpl
}

const makeSut = (): SutTypes => {
  const client = mockDeep<Client>()
  const chat = mock<Chat>({ id: { _serialized: 'any_id' }, name: 'any_name', isGroup: false })

  client.getChats.mockResolvedValue([chat])
  client.info.wid._serialized = 'myId'

  const clientDataSource = new ClientDataSourceImpl(client)

  return { client, clientDataSource }
}

describe('client-datasource-impl.spec.ts', () => {
  describe('getAllChats', () => {
    test('should call getChats', async () => {
      const { client, clientDataSource } = makeSut()

      await clientDataSource.getAllChats()

      expect(client.getChats).toHaveBeenCalled()
    })

    test('should return all chats', async () => {
      const { client, clientDataSource } = makeSut()
      const chats = [
        mock<Chat>({ id: { _serialized: 'any_id0' }, name: 'any_name0', isGroup: false }),
        mock<Chat>({ id: { _serialized: 'any_id1' }, name: 'any_name1', isGroup: false })
      ]

      client.getChats.mockResolvedValue(chats)

      const result = await clientDataSource.getAllChats()

      expect(result).toEqual([
        { id: 'any_id0', name: 'any_name0', isGroup: false, isAdmin: false },
        { id: 'any_id1', name: 'any_name1', isGroup: false, isAdmin: false }
      ])
    })

    // test('should return all chats with isAdmin false but is group', async () => {
    //   const { client, clientDataSource } = makeSut()
    //   const groupChat = mockDeep<GroupChat>({ id: { _serialized: 'any_id1' }, name: 'any_name1', isGroup: true })
    //   groupChat.participants = [
    //     mock<GroupParticipant>({ isAdmin: true, id: { _serialized: 'anotherId' } }),
    //     mock<GroupParticipant>({ isAdmin: false, id: { _serialized: 'myId' } })
    //   ]
    //   const chats = [
    //     mock<Chat>({ id: { _serialized: 'any_id0' }, name: 'any_name0', isGroup: false }),
    //     groupChat
    //   ]

    //   client.getChats.mockResolvedValue(chats)

    //   const result = await clientDataSource.getAllChats()

    //   expect(result).toEqual([
    //     { id: 'any_id0', name: 'any_name0', isGroup: false, isAdmin: false },
    //     { id: 'any_id1', name: 'any_name1', isGroup: true, isAdmin: false }
    //   ])
    // })

    test('should return all chats with isAdmin true', async () => {
      const { client, clientDataSource } = makeSut()
      const groupChat = mockDeep<GroupChat>({ id: { _serialized: 'any_id1' }, name: 'any_name1', isGroup: true })
      groupChat.participants = [mock<GroupParticipant>({ isAdmin: true, id: { _serialized: 'myId' } })]
      const chats = [
        mock<Chat>({ id: { _serialized: 'any_id0' }, name: 'any_name0', isGroup: false }),
        groupChat
      ]

      client.getChats.mockResolvedValue(chats)

      const result = await clientDataSource.getAllChats()

      expect(result).toEqual([
        { id: 'any_id0', name: 'any_name0', isGroup: false, isAdmin: false },
        { id: 'any_id1', name: 'any_name1', isGroup: true, isAdmin: true }
      ])
    })
  })
})
