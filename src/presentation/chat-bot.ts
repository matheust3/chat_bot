/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Chat, GroupChat, Client as Whatsapp, Message, MessageMedia } from 'whatsapp-web.js'
import { Sticker } from '../domain/models/sticker'
import { ChatRepository } from '../domain/repositories/chat-repository'
import { DatabaseRepository } from '../domain/repositories/database-repository'
import { GhostRepository } from '../domain/repositories/ghost-repository'
import { StickerRepository } from '../domain/repositories/sticker-repository'
export class ChatBot {
  private readonly _client: Whatsapp
  private readonly _stickerRepository: StickerRepository
  private readonly _databaseRepository: DatabaseRepository
  private readonly _chatRepository: ChatRepository
  private readonly _ghostRepository: GhostRepository
  private readonly _stickerChatIdToNotReturn = '5519993513997-1603762358@g.us'
  private readonly _stickerChatId = '556599216704-1613557634@g.us'

  constructor (client: Whatsapp, stickerRepository: StickerRepository,
    databaseRepository: DatabaseRepository,
    chatRepository: ChatRepository,
    ghostRepository: GhostRepository) {
    this._client = client
    this._stickerRepository = stickerRepository
    this._databaseRepository = databaseRepository
    this._chatRepository = chatRepository
    this._ghostRepository = ghostRepository
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async onAnyMessage (message: Message): Promise<void> {
    const chat = await message.getChat()
    const contact = await message.getContact()
    // Verifica se o chat eh autorizado
    let authorized: boolean
    try {
      authorized = await this._databaseRepository.isChatAuthorized(chat.id._serialized)
    } catch (e) {
      await message.reply(`Bot message:\n☠️☠️☠️\n\n${e.message as string}`)
    }
    if (authorized || message.fromMe || contact.isMyContact) {
      if (chat.id._serialized === this._stickerChatId) {
        await this._ghostRepository.checkGhost(message)
      }
      switch (message.body) {
        case '#chatId':
          await this._chatRepository.getChatId(message)
          break
        case '#isAuthorized?':
          if (message.fromMe) { await message.reply(String(authorized)) }
          break
        case '#addChatToAuthorizedChats':
          if (message.fromMe) {
            try {
              await this._databaseRepository.addChatToAuthorizedChats(chat.id._serialized)
              await message.reply('Bot message:\r\nOk!')
            } catch (e) {
              await message.reply(`Bot message:\r\n  Fails:\r\n${e.message as string}`)
            }
          }
          break
        case '#ajuda':
        case '#help' :
          if (message.fromMe) {
            await message.reply('Bot message:\n🤡 O Matheus esqueceu como chamar as funções que ele mesmo programou...\n\n#addChatToAuthorizedChats - Autoriza um chat a usar o bot\n#isAuthorized? - Verifica se o chat esta na lista de autorizados')
          } else {
            await message.reply('Bot message:\nAJUDA:\n\n#ajuda -> Esta mensagem de ajuda\n#help -> Esta mensagem de ajuda\n#link -> Link do grupo (de figurinhas)\n\nPARA FAZER FIGURINHAS\n\nColocar #sticker na legenda de uma mídia ou responder uma mídia com #sticker')
          }
          break
        default:
          // Retorna e nao faz nada se for comando para banir do grupo
          if ((await this.ban(message, chat))) { return }
          // Retorna e nao faz nada se for banido do grupo
          if ((await this.checkForLinkInGroup(message, chat))) { return }
          // Pega o link do grupo
          if ((await this.getGroupCode(message, chat))) { return }
          if ((message.hasMedia && message.body === '#sticker') || (message.body !== undefined && message.body === '#sticker' && message.hasQuotedMsg)) {
            const contact = await message.getContact()
            if ((chat.isGroup || message.fromMe || contact.isMyContact) && (!contact.isBlocked)) {
              if (message.body === '#sticker' && message.hasQuotedMsg) {
                const quotedMsg = await message.getQuotedMessage()
                if (quotedMsg.hasMedia) {
                  await this.createSticker(message, true, chat)
                } else {
                  await quotedMsg.reply('😔 Eu não consigo fazer uma figurinha disso 😔')
                }
              } else {
                await this.createSticker(message, false, chat)
              }
            } else {
              if (contact.isBlocked) {
                await message.reply('🥱')
              } else {
                const stickerChat = await this._client.getChatById(this._stickerChatId) as GroupChat
                const inviteCode = await stickerChat.getInviteCode()
                await this._client.sendMessage(chat.id._serialized, `=> Esta é uma mensagem do bot <=\n\nMeu criador só autoriza seus contatos a fazerem figurinhas no privado, mas você ainda pode me usar nos grupos em que meu criador participa\n\nAqui esta um desses grupos:\nhttps://chat.whatsapp.com/${inviteCode}`)
              }
            }
          }
          break
      }
    }
  }

  async getChatId (message: Message, chat: Chat): Promise<boolean> {
    if (message.fromMe && message.body.toLowerCase().startsWith('#cid')) {
      await message.reply(chat.id._serialized)
      return true
    }
    return false
  }

  async ban (message: Message, chat: Chat): Promise<boolean> {
    if (chat.isGroup && message.body.toLowerCase().startsWith('#ban') && message.hasQuotedMsg) {
      const groupChat = chat as GroupChat
      const contact = await message.getContact()
      const participant = groupChat.participants.find((value) => value.id._serialized === contact.id._serialized)
      if (participant.isAdmin) {
        const quotedMsg = await message.getQuotedMessage()
        const contactToRemove = await quotedMsg.getContact()
        await groupChat.removeParticipants([contactToRemove.id._serialized])
        return true
      } else {
        return false
      }
    } else {
      return false
    }
  }

  async getGroupCode (message: Message, chat: Chat): Promise<boolean> {
    if (message.body.toLowerCase().startsWith('#link')) {
      let groupChat: GroupChat = (chat as GroupChat)
      if (groupChat.id._serialized !== this._stickerChatIdToNotReturn) {
        if (!chat.isGroup || !groupChat.name.toLowerCase().includes('figurinhas')) {
          groupChat = (await this._client.getChatById(this._stickerChatId)) as GroupChat
        }
        const groupCode = await groupChat.getInviteCode()
        await message.reply(`https://chat.whatsapp.com/${groupCode}`)
        return true
      } else {
        return false
      }
    } else {
      return false
    }
  }

  async checkForLinkInGroup (message: Message, chat: Chat): Promise<boolean> {
    if (chat.isGroup && !message.fromMe) {
      const groupChat: GroupChat = (chat as GroupChat)
      if (groupChat.name.toLowerCase().includes('figurinhas')) {
        if (message.links.length > 0) {
          await message.reply('Mensagem do Bot: \n🚫 CONTEÚDO MALICIOSO OU FORA DO CONTEXTO DO GRUPO 🚫')
          const contact = await message.getContact()
          await groupChat.removeParticipants([contact.id._serialized])
          return true
        } else {
          return false
        }
      } else {
        return false
      }
    }
    return false
  }

  async createSticker (message: Message, isQuoted: boolean, chat: Chat): Promise<void> {
    const mediaMessage = isQuoted ? (await message.getQuotedMessage()) : message
    let msgMedia: MessageMedia
    try {
      msgMedia = await mediaMessage.downloadMedia()
    } catch (e) {
      await mediaMessage.reply('Nao consegui baixar a imagem pra fazer a figurinha 😪😪')
      console.error(e)
      return
    }
    if (msgMedia.mimetype.includes('video') || msgMedia.mimetype.includes('image')) {
      let result: Sticker
      try {
        result = await this._stickerRepository.createSticker(msgMedia.data)
      } catch (e) {
        await message.reply('👾 Não consegui converter o arquivo para um sticker 👾 - Fale com meu criador se você continuar recebendo essa mensagem')
        console.error(e)
        return
      }
      if (result?.valid) {
        const media = MessageMedia.fromFilePath(result.path)
        try {
          await this._client.sendMessage(chat.id._serialized, null, { media: media, sendMediaAsSticker: true })
        } catch (err) {
          await message.reply('Nao consegui enviar sua figurinha 😓 - Tente diminuir o tamanho do arquivo (em MB)')
          console.error(err)
        }
      } else {
        await message.reply('Não foi possível criar sua figurinha 😣 - Talvez o formato do arquivo não é suportado')
      }
    } else {
      await message.reply('Eu não consigo fazer uma figurinha disso 😔')
    }
  }
}
