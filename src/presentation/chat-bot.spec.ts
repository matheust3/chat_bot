import { mock, MockProxy } from 'jest-mock-extended'
import { Chat, Client as Whatsapp, Contact, Message, MessageMedia } from 'whatsapp-web.js'
import { StickerRepository } from '../domain/repositories/sticker-repository'
import { ChatBot } from './chat-bot'

interface SutTypes{
  whatsApp: MockProxy<Whatsapp> & Whatsapp
  chatBot: ChatBot
  message: MockProxy<Message> & Message
  mediaMessage: MessageMedia
  responseMessage: MockProxy<Message> & Message
  fileBuffer: Buffer
  stickerRepository: MockProxy<StickerRepository> & StickerRepository
  chat: Chat
  contact: Contact
}

const makeSut = (): SutTypes => {
  const stickerRepository = mock<StickerRepository>()
  const whatsApp = mock<Whatsapp>()
  const message = mock<Message>()
  message.body = '#sticker'
  message.hasQuotedMsg = false
  const responseMessage = mock<Message>()
  message.body = '#sticker'
  const fileBuffer = Buffer.from('file')
  const chat: Chat = mock<Chat>()
  chat.id._serialized = 'id of chat'
  chat.isGroup = true
  const contact: Contact = mock<Contact>()
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

  const chatBot = new ChatBot(whatsApp, stickerRepository)

  return {
    whatsApp,
    message,
    chat,
    responseMessage,
    stickerRepository,
    mediaMessage,
    chatBot,
    fileBuffer,
    contact
  }
}

describe('ChatBot', () => {
  test('ensure remove case sensitive from bodys', async () => {
    //! Arrange
    const { message, stickerRepository, chatBot, fileBuffer } = makeSut()
    message.body = '#sTicKer'
    //! Act
    await chatBot.onAnyMessage(message)
    //! Assert
    expect(stickerRepository.createSticker).toHaveBeenCalledWith(fileBuffer.toString('base64'))
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
    //! Act
    await chatBot.onAnyMessage(responseMessage)
    //! Assert
    expect(stickerRepository.createSticker).toHaveBeenCalledTimes(0)
    expect(whatsApp.sendMessage).toHaveBeenCalledWith(chat.id._serialized, '=> Esta é uma mensagem do bot <=\n\nMeu criador só autoriza seus contatos a fazerem figurinhas no privado, mas você ainda pode me usar nos grupos em que meu criador participa\n\nAqui esta um desses grupos:\nhttps://chat.whatsapp.com/BSs7Gj45KcUA014nWw8bBb')
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
    expect(message.reply).toHaveBeenCalledWith('Não foi possível criar sua figurinha 😣')
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
})
