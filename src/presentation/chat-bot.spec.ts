import { mock, MockProxy } from 'jest-mock-extended'
import { Chat, Client as Whatsapp, Contact, GroupChat, Message, MessageMedia } from 'whatsapp-web.js'
import { ChatRepository } from '../domain/repositories/chat-repository'
import { DatabaseRepository } from '../domain/repositories/database-repository'
import { GhostRepository } from '../domain/repositories/ghost-repository'
import { StickerRepository } from '../domain/repositories/sticker-repository'
import { ChatBot } from './chat-bot'

interface SutTypes{
  whatsApp: MockProxy<Whatsapp> & Whatsapp
  chatBot: ChatBot
  message: MockProxy<Message> & Message
  mediaMessage: MessageMedia
  responseMessage: MockProxy<Message> & Message
  databaseRepository: MockProxy<DatabaseRepository> & DatabaseRepository
  fileBuffer: Buffer
  stickerRepository: MockProxy<StickerRepository> & StickerRepository
  chatRepository: MockProxy<ChatRepository> & ChatRepository
  ghostRepository: MockProxy<GhostRepository> & GhostRepository
  chat: Chat
  contact: Contact
}

const makeSut = (): SutTypes => {
  const stickerRepository = mock<StickerRepository>()
  const whatsApp = mock<Whatsapp>()
  const message = mock<Message>()
  const databaseRepository = mock<DatabaseRepository>()
  const chatRepository = mock<ChatRepository>()
  const ghostRepository = mock<GhostRepository>()

  message.body = '#sticker'
  message.hasQuotedMsg = false
  const responseMessage = mock<Message>()
  message.body = '#sticker'
  const fileBuffer = Buffer.from('file')
  const chat: Chat = mock<Chat>()
  chat.id._serialized = 'id of chat'
  chat.isGroup = true
  chat.name = ''
  const contact: Contact = mock<Contact>()
  contact.isBlocked = false
  contact.id._serialized = 'any id'

  const mediaMessage: MessageMedia = {
    data: fileBuffer.toString('base64'),
    mimetype: 'image',
    filename: 'any file name'
  }
  jest.spyOn(stickerRepository, 'createSticker').mockReturnValue(new Promise(resolve => resolve({ path: `${__dirname}/../../fixtures/png.png`, type: 'static', valid: true })))
  jest.spyOn(stickerRepository, 'createSticker')
  jest.spyOn(message, 'downloadMedia').mockReturnValue(new Promise(resolve => resolve(mediaMessage)))
  jest.spyOn(message, 'getChat').mockReturnValue(new Promise(resolve => resolve(chat)))
  jest.spyOn(message, 'getContact').mockReturnValue(new Promise(resolve => resolve(contact)))
  jest.spyOn(stickerRepository, 'createSticker')
  jest.spyOn(responseMessage, 'downloadMedia').mockReturnValue(new Promise(resolve => resolve(mediaMessage)))
  jest.spyOn(responseMessage, 'getQuotedMessage').mockReturnValue(new Promise(resolve => resolve(message)))
  jest.spyOn(responseMessage, 'getChat').mockReturnValue(new Promise(resolve => resolve(chat)))
  jest.spyOn(responseMessage, 'getContact').mockReturnValue(new Promise(resolve => resolve(contact)))
  databaseRepository.isChatAuthorized.mockResolvedValue(true)
  chatRepository.getChatId.mockResolvedValue('chatId')

  const chatBot = new ChatBot(whatsApp, stickerRepository, databaseRepository, chatRepository, ghostRepository)

  return {
    whatsApp,
    message,
    chat,
    responseMessage,
    stickerRepository,
    mediaMessage,
    chatBot,
    fileBuffer,
    contact,
    databaseRepository,
    chatRepository,
    ghostRepository
  }
}
describe('chat-bot.spec.ts - ghostRepository', () => {
  test('ensure check if is ghost if is sticker chat', async () => {
    //! Arrange
    const { message, chatBot, ghostRepository, chat } = makeSut()
    chat.id._serialized = '556599216704-1613557634@g.us'
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(ghostRepository.checkGhost).toBeCalledWith(message)
  })
  test('ensure not check if is ghost if is not sticker chat', async () => {
    //! Arrange
    const { message, chatBot, ghostRepository, chat } = makeSut()
    chat.id._serialized = 'anyChatId'
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(ghostRepository.checkGhost).toHaveBeenCalledTimes(0)
  })
})

describe('ChatBot', () => {
  test('ensure not call chat repository if is not authorized, not is my contact and not is me', async () => {
    //! Arrange
    const { message, chatRepository, chatBot, contact, databaseRepository } = makeSut()
    databaseRepository.isChatAuthorized.mockResolvedValue(false)
    contact.isMyContact = false
    message.fromMe = false
    message.body = '#chatId'
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(chatRepository.getChatId).toHaveBeenCalledTimes(0)
  })
  test('ensure call chat repository if is authorized, not is my contact and not is me', async () => {
    //! Arrange
    const { message, chatRepository, chatBot, contact, databaseRepository } = makeSut()
    databaseRepository.isChatAuthorized.mockResolvedValue(true)
    contact.isMyContact = false
    message.fromMe = false
    message.body = '#chatId'
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(chatRepository.getChatId).toHaveBeenCalledTimes(1)
  })
  test('ensure call chat repository if is not authorized but not is my contact and not is me', async () => {
    //! Arrange
    const { message, chatRepository, chatBot, contact, databaseRepository } = makeSut()
    databaseRepository.isChatAuthorized.mockResolvedValue(false)
    contact.isMyContact = true
    message.fromMe = false
    message.body = '#chatId'
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(chatRepository.getChatId).toHaveBeenCalledTimes(1)
  })
  test('ensure call chat repository if is not authorized, not is my contact but not is me', async () => {
    //! Arrange
    const { message, chatRepository, chatBot, contact, databaseRepository } = makeSut()
    databaseRepository.isChatAuthorized.mockResolvedValue(false)
    contact.isMyContact = false
    message.fromMe = true
    message.body = '#chatId'
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(chatRepository.getChatId).toHaveBeenCalledTimes(1)
  })
  test('ensure return message if check if is authorized throws', async () => {
    //! Arrange
    const { message, databaseRepository, chatBot } = makeSut()
    databaseRepository.isChatAuthorized.mockRejectedValue(Error('any error test'))
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(message.reply).toHaveBeenCalledWith(
      'Bot message:\n☠️☠️☠️\n\nany error test'
    )
  })
})

describe('chat-bot.spec.ts - isAuthorized?', () => {
  test('ensure return true if is authorized', async () => {
    //! Arrange
    const { message, chatBot, databaseRepository } = makeSut()
    message.fromMe = true
    message.body = '#isAuthorized?'
    databaseRepository.isChatAuthorized.mockResolvedValue(true)
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(message.reply).toHaveBeenCalledWith('true')
  })
  test('ensure return false if is not authorized', async () => {
    //! Arrange
    const { message, chatBot, databaseRepository } = makeSut()
    message.fromMe = true
    message.body = '#isAuthorized?'
    databaseRepository.isChatAuthorized.mockResolvedValue(false)
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(message.reply).toHaveBeenCalledWith('false')
  })
  test('ensure not return message if is not me', async () => {
    //! Arrange
    const { message, chatBot, databaseRepository } = makeSut()
    message.fromMe = false
    message.body = '#isAuthorized?'
    databaseRepository.isChatAuthorized.mockResolvedValue(true)
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(message.reply).toHaveBeenCalledTimes(0)
  })
})
describe('chat-bot.spec.ts - help/ajuda', () => {
  test('ensure send help message for user if help', async () => {
    //! Arrange
    const { message, chatBot } = makeSut()
    message.body = '#help'
    message.fromMe = false
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(message.reply).toHaveBeenCalledWith(
      'Bot message:\nAJUDA:\n\n#ajuda -> Esta mensagem de ajuda\n#help -> Esta mensagem de ajuda\n#link -> Link do grupo (de figurinhas)\n\nPARA FAZER FIGURINHAS\n\nColocar #sticker na legenda de uma mídia ou responder uma mídia com #sticker'
    )
  })
  test('ensure send help message for user if ajuda', async () => {
    //! Arrange
    const { message, chatBot } = makeSut()
    message.body = '#ajuda'
    message.fromMe = false
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(message.reply).toHaveBeenCalledWith(
      'Bot message:\nAJUDA:\n\n#ajuda -> Esta mensagem de ajuda\n#help -> Esta mensagem de ajuda\n#link -> Link do grupo (de figurinhas)\n\nPARA FAZER FIGURINHAS\n\nColocar #sticker na legenda de uma mídia ou responder uma mídia com #sticker'
    )
  })
  test('ensure return help message to me if is me', async () => {
    //! Arrange
    const { message, chatBot } = makeSut()
    message.body = '#help'
    message.fromMe = true
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(message.reply).toHaveBeenCalledWith(
      'Bot message:\n🤡 O Matheus esqueceu como chamar as funções que ele mesmo programou...\n\n#addChatToAuthorizedChats - Autoriza um chat a usar o bot\n#isAuthorized? - Verifica se o chat esta na lista de autorizados'
    )
  })
})
describe('chat-bot.spec.ts - addChatToAuthorizedChats', () => {
  test('ensure call database repository if message is from me', async () => {
    //! Arrange
    const { message, chat, chatBot, databaseRepository } = makeSut()
    message.fromMe = true
    chat.id._serialized = 'chat id'
    message.body = '#addChatToAuthorizedChats'
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(databaseRepository.addChatToAuthorizedChats).toHaveBeenCalledWith('chat id')
    expect(message.reply).toHaveBeenCalledWith('Bot message:\r\nOk!')
  })
  test('ensure return message if fails to add chat id to authorized list', async () => {
    //! Arrange
    const { message, chat, chatBot, databaseRepository } = makeSut()
    databaseRepository.addChatToAuthorizedChats.mockRejectedValue(Error('any error test'))
    message.fromMe = true
    chat.id._serialized = 'chat id'
    message.body = '#addChatToAuthorizedChats'
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(message.reply).toHaveBeenCalledWith('Bot message:\r\n  Fails:\r\nany error test')
  })
  test('ensure NOT call database repository if message is NOT from me', async () => {
    //! Arrange
    const { message, chat, chatBot, databaseRepository } = makeSut()
    message.fromMe = false
    chat.id._serialized = 'chat id'
    message.body = '#addChatToAuthorizedChats'
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(databaseRepository.addChatToAuthorizedChats).toHaveBeenCalledTimes(0)
  })
})

describe('chat-bot.spec.ts - onAnyMessage', () => {
  test('ensure check if chat is authorized', async () => {
    //! Arrange
    const { chatBot, message, databaseRepository, chat } = makeSut()
    chat.id._serialized = 'chatId'
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(databaseRepository.isChatAuthorized).toHaveBeenCalledWith('chatId')
  })
})

describe('chat-bot.spec.ts - get group link', () => {
  test('return false if group id is not to return', async () => {
    //! Arrange
    const { chat, message, chatBot } = makeSut()
    chat.id._serialized = '5519993513997-1603762358@g.us'
    //! Act
    const result = await chatBot.getGroupCode(message, chat)
    //! Assert
    expect(result).toBe(false)
  })
  test('ensure reply link group', async () => {
    //! Arrange
    const { message, chat, chatBot } = makeSut()
    chat.name = 'figurinhas'
    chat.isGroup = true
    message.body = '#link'
    const groupChat: MockProxy< GroupChat> & GroupChat = chat as (MockProxy< GroupChat> & GroupChat)
    groupChat.getInviteCode.mockReturnValue(new Promise(resolve => resolve('link')))
    //! Act
    const result = await chatBot.getGroupCode(message, groupChat)
    //! Assert
    expect(result).toBe(true)
    expect(groupChat.getInviteCode).toHaveBeenCalledTimes(1)
    expect(message.reply).toHaveBeenCalledWith('https://chat.whatsapp.com/link')
  })
  test('ensure not reply link group if body is not #link', async () => {
    //! Arrange
    const { message, chat, chatBot } = makeSut()
    chat.name = 'figurinhas'
    chat.isGroup = true
    message.body = 'any'
    const groupChat: MockProxy< GroupChat> & GroupChat = chat as (MockProxy< GroupChat> & GroupChat)
    groupChat.getInviteCode.mockReturnValue(new Promise(resolve => resolve('link')))
    //! Act
    const result = await chatBot.getGroupCode(message, groupChat)
    //! Assert
    expect(result).toBe(false)
    expect(groupChat.getInviteCode).toHaveBeenCalledTimes(0)
    expect(message.reply).toHaveBeenCalledTimes(0)
  })
  test('ensure reply link group of stickerGroup if group name not contains figurinhas', async () => {
    //! Arrange
    const { message, chat, chatBot, whatsApp } = makeSut()
    const stickerChat = mock<GroupChat>()
    stickerChat.getInviteCode.mockReturnValue(new Promise(resolve => resolve('link2')))
    whatsApp.getChatById.mockReturnValue(new Promise(resolve => resolve(stickerChat)))

    chat.name = 'any group name'
    chat.isGroup = true
    message.body = '#link'
    const groupChat: MockProxy< GroupChat> & GroupChat = chat as (MockProxy< GroupChat> & GroupChat)
    groupChat.getInviteCode.mockReturnValue(new Promise(resolve => resolve('link')))
    //! Act
    const result = await chatBot.getGroupCode(message, groupChat)
    //! Assert
    expect(result).toBe(true)
    expect(groupChat.getInviteCode).toHaveBeenCalledTimes(0)
    expect(whatsApp.getChatById).toHaveBeenCalledWith('556599216704-1613557634@g.us')
    expect(stickerChat.getInviteCode).toHaveBeenCalledTimes(1)
    expect(message.reply).toHaveBeenCalledWith('https://chat.whatsapp.com/link2')
  })
  test('ensure reply link group of stickerGroup if is not a group', async () => {
    //! Arrange
    const { message, chat, chatBot, whatsApp } = makeSut()
    const stickerChat = mock<GroupChat>()
    stickerChat.getInviteCode.mockReturnValue(new Promise(resolve => resolve('link2')))
    whatsApp.getChatById.mockReturnValue(new Promise(resolve => resolve(stickerChat)))

    chat.name = 'any group name'
    chat.isGroup = false
    message.body = '#link'
    //! Act
    const result = await chatBot.getGroupCode(message, chat)
    //! Assert
    expect(result).toBe(true)
    expect(whatsApp.getChatById).toHaveBeenCalledWith('556599216704-1613557634@g.us')
    expect(stickerChat.getInviteCode).toHaveBeenCalledTimes(1)
    expect(message.reply).toHaveBeenCalledWith('https://chat.whatsapp.com/link2')
  })
})
describe('chat-bot.spec.ts - check for links', () => {
  test('ensure remove user if message as link', async () => {
    //! Arrange
    const { message, chatBot, chat } = makeSut()
    const groupChat: GroupChat = chat as GroupChat
    message.links = ['link']
    groupChat.isGroup = true
    groupChat.name = 'figurinhas'
    message.fromMe = false
    //! Act
    const result = await chatBot.checkForLinkInGroup(message, groupChat)
    //! Assert
    expect(result).toEqual(true)
    expect(message.reply).toHaveBeenCalledWith('Mensagem do Bot: \n🚫 CONTEÚDO MALICIOSO OU FORA DO CONTEXTO DO GRUPO 🚫')
    expect(groupChat.removeParticipants).toHaveBeenCalledWith(['any id'])
  })
  test('ensure not remove user if message as link and is me', async () => {
    //! Arrange
    const { message, chatBot, chat } = makeSut()
    const groupChat: GroupChat = chat as GroupChat
    message.links = ['link']
    groupChat.isGroup = true
    groupChat.name = 'figurinhas'
    message.fromMe = true
    //! Act
    const result = await chatBot.checkForLinkInGroup(message, groupChat)
    //! Assert
    expect(result).toEqual(false)
    expect(message.reply).toHaveBeenCalledTimes(0)
    expect(groupChat.removeParticipants).toHaveBeenCalledTimes(0)
  })
})

describe('ChatBot -- #sticker', () => {
  test('ensure call sticker repository to create a sticker if body is #sticker and quotedMsgObj != null and quotedMsg type == "image"', async () => {
    //! Arrange
    const { responseMessage, mediaMessage, stickerRepository, chatBot, fileBuffer } = makeSut()
    responseMessage.body = '#sticker'
    mediaMessage.mimetype = 'image'
    //! Act
    await chatBot.onAnyMessage(responseMessage)
    //! Assert
    expect(stickerRepository.createSticker).toHaveBeenCalledWith(fileBuffer.toString('base64'))
  })
  test('ensure call sticker repository to create a sticker if body is #sticker and quotedMsgObj != null and quotedMsg type == "video"', async () => {
    //! Arrange
    const { responseMessage, mediaMessage, stickerRepository, chatBot, fileBuffer } = makeSut()
    responseMessage.body = '#sticker'
    mediaMessage.mimetype = 'video'
    //! Act
    await chatBot.onAnyMessage(responseMessage)
    //! Assert
    expect(stickerRepository.createSticker).toHaveBeenCalledWith(fileBuffer.toString('base64'))
  })
  test('ensure send a message if not is my contact and is my private chat and not is fromMe', async () => {
    //! Arrange
    const { responseMessage, chat, contact, stickerRepository, chatBot, whatsApp } = makeSut()
    responseMessage.body = '#sticker'
    chat.isGroup = false
    contact.isMyContact = false
    responseMessage.fromMe = false
    const stickerChat = mock<GroupChat>()
    whatsApp.getChatById.mockResolvedValue(stickerChat)
    stickerChat.getInviteCode.mockResolvedValue('inviteCode')
    //! Act
    await chatBot.onAnyMessage(responseMessage)
    //! Assert
    expect(stickerRepository.createSticker).toHaveBeenCalledTimes(0)
    expect(whatsApp.getChatById).toHaveBeenCalledWith('556599216704-1613557634@g.us')
    expect(whatsApp.sendMessage).toHaveBeenCalledWith(chat.id._serialized, '=> Esta é uma mensagem do bot <=\n\nMeu criador só autoriza seus contatos a fazerem figurinhas no privado, mas você ainda pode me usar nos grupos em que meu criador participa\n\nAqui esta um desses grupos:\nhttps://chat.whatsapp.com/inviteCode')
  })
  test('ensure not call sticker repository to create a sticker and send a message if body is #sticker and quotedMsgObj != null but quotedMsg not has a media', async () => {
    //! Arrange
    const { responseMessage, message, stickerRepository, chatBot } = makeSut()
    responseMessage.body = '#sticker'
    message.hasMedia = false
    //! Act
    await chatBot.onAnyMessage(responseMessage)
    //! Assert
    expect(stickerRepository.createSticker).toHaveBeenCalledTimes(0)
    expect(message.reply).toHaveBeenCalledWith('😔 Eu não consigo fazer uma figurinha disso 😔')
  })
  test('ensure call sticker repository to create a sticker if body is #sticker', async () => {
    //! Arrange
    const { message, stickerRepository, chatBot, fileBuffer } = makeSut()
    message.body = '#sticker'
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(stickerRepository.createSticker).toHaveBeenCalledWith(fileBuffer.toString('base64'))
  })
  test('ensure call sticker repository to create a sticker if body is #sticker and is fromMe', async () => {
    //! Arrange
    const { message, stickerRepository, chatBot, fileBuffer } = makeSut()
    message.body = '#sticker'
    message.fromMe = true
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(stickerRepository.createSticker).toHaveBeenCalledWith(fileBuffer.toString('base64'))
  })
  test('ensure not call sticker repository to create a sticker if body not is #sticker', async () => {
    //! Arrange
    const { message, stickerRepository, chatBot } = makeSut()
    message.body = 'any value but not #sticker'
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(stickerRepository.createSticker).toHaveBeenCalledTimes(0)
  })

  test('ensure send animated sticker if sticker is valid and is animated', async () => {
    //! Arrange
    const { message, mediaMessage, chatBot, chat, whatsApp, stickerRepository } = makeSut()
    mediaMessage.mimetype = 'video'
    jest.spyOn(stickerRepository, 'createSticker').mockReturnValue(new Promise(resolve => resolve({ path: `${__dirname}/../../fixtures/gif.gif`, type: 'animated', valid: true })))
    const mediaMessageResponse = MessageMedia.fromFilePath(`${__dirname}/../../fixtures/gif.gif`)
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(whatsApp.sendMessage).toHaveBeenCalledWith(chat.id._serialized, null, { media: mediaMessageResponse, sendMediaAsSticker: true })
  })
  test('ensure send static sticker if sticker is valid and is static', async () => {
    //! Arrange
    const { message, mediaMessage, chatBot, chat, whatsApp, stickerRepository } = makeSut()
    mediaMessage.mimetype = 'image'
    jest.spyOn(stickerRepository, 'createSticker').mockReturnValue(new Promise(resolve => resolve({ path: `${__dirname}/../../fixtures/png.png`, type: 'static', valid: true })))
    const mediaMessageResponse = MessageMedia.fromFilePath(`${__dirname}/../../fixtures/png.png`)
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(whatsApp.sendMessage).toHaveBeenCalledWith(chat.id._serialized, null, { media: mediaMessageResponse, sendMediaAsSticker: true })
  })
  test('ensure send a message if sticker is invalid', async () => {
    //! Arrange
    const { message, chatBot, stickerRepository } = makeSut()
    jest.spyOn(stickerRepository, 'createSticker').mockReturnValue(new Promise(resolve => resolve({ path: 'path to image', type: 'static', valid: false })))
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(message.reply).toHaveBeenCalledWith('Não foi possível criar sua figurinha 😣 - Talvez o formato do arquivo não é suportado')
  })
  test('ensure send a message if downloadMedia throws', async () => {
    //! Arrange
    const { message, chatBot } = makeSut()
    message.downloadMedia.mockReturnValue(new Promise((resolve, reject) => reject(Error('test error - error to download media'))))
    jest.spyOn(global.console, 'error')
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(message.reply).toHaveBeenCalledWith('Nao consegui baixar a imagem pra fazer a figurinha 😪😪')
    expect(console.error).toHaveBeenCalledWith(Error('test error - error to download media'))
  })
  test('ensure send a message if send sticker throws', async () => {
    //! Arrange
    const { message, chatBot, whatsApp } = makeSut()
    whatsApp.sendMessage.mockReturnValue(new Promise((resolve, reject) => reject(Error('test error - error to send message'))))
    jest.spyOn(global.console, 'error')
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(message.reply).toHaveBeenCalledWith('Nao consegui enviar sua figurinha 😓 - Tente diminuir o tamanho do arquivo (em MB)')
    expect(console.error).toHaveBeenCalledWith(Error('test error - error to send message'))
  })
  test('ensure send a message if repository throws', async () => {
    //! Arrange
    const { message, chatBot, stickerRepository } = makeSut()
    stickerRepository.createSticker.mockReturnValue(new Promise((resolve, reject) => reject(Error('test error - create sticker'))))
    jest.spyOn(global.console, 'error')
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(message.reply).toHaveBeenCalledWith('👾 Não consegui converter o arquivo para um sticker 👾 - Fale com meu criador se você continuar recebendo essa mensagem')
    expect(message.reply).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith(Error('test error - create sticker'))
  })

  test('ensure send a joke if contact is blocked ', async () => {
    //! Arrange
    const { chatBot, message, contact } = makeSut()
    contact.isBlocked = true
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(message.reply).toHaveBeenCalledWith('🥱')
    expect(message.reply).toHaveBeenCalledTimes(1)
  })
})
