import { IClient } from '../protocols/IClient'
import { IMessage } from '../protocols/IMessage'
import { IMessageType } from '../protocols/IMessageType'
import { GroupMessagesRepositoryInstance } from '../singletons/group-messages-repository-instance'
import { DirectMessagesRepositoryInstance } from '../singletons/direct-messages-repository-instance'
import { AudioTranscriptionServiceImpl } from '../../data/services/audio-transcription-service'
import { GroqAudioTranscriptionDatasource } from '../../infra/groq-audio-transcription-datasource'

const audioTranscriptionService = new AudioTranscriptionServiceImpl(
  new GroqAudioTranscriptionDatasource()
)

export default async (message: IMessage, client: IClient, next: () => void): Promise<void> => {
  try {
    if (message.groupId !== undefined) {
      let content = ''
      let isAudio = false
      let originalAudioTranscription: string | undefined

      // Verificar se é mensagem de áudio
      if (message.type === IMessageType.AUDIO) {
        try {
          // Baixar o arquivo de áudio
          const audioBuffer = await client.downloadFile(message.id)
          // Transcrever o áudio
          const transcription = await audioTranscriptionService.transcribe(audioBuffer)
          content = transcription
          isAudio = true
          originalAudioTranscription = transcription
        } catch (error) {
          console.error('Erro ao transcrever áudio:', error)
          // Se falhar a transcrição, pular esta mensagem
          next()
          return
        }
      } else {
        // Para mensagens de texto normais
        const bodyContent = message.body?.trim() ?? ''
        const captionContent = message.caption?.trim() ?? ''
        content = bodyContent.length > 0 ? bodyContent : captionContent
      }

      if (content.length === 0) {
        next()
        return
      }

      let senderName = message.senderName
      if (senderName === undefined || senderName.trim().length === 0) {
        senderName = await client.getContactName(message.sender)
      }

      let groupName = message.groupName
      if (groupName === undefined || groupName.trim().length === 0) {
        groupName = await client.getChatName(message.groupId)
      }

      await GroupMessagesRepositoryInstance.saveGroupMessage({
        groupExternalId: message.groupId,
        groupName,
        messageExternalId: message.id,
        senderId: message.sender,
        senderName,
        content,
        sentAt: message.sentAt ?? new Date(),
        fromMe: message.fromMe,
        isAudio,
        originalAudioTranscription
      })
    }

    if (message.groupId === undefined) {
      let content = ''
      let isAudio = false
      let originalAudioTranscription: string | undefined

      // Verificar se é mensagem de áudio
      if (message.type === IMessageType.AUDIO) {
        try {
          // Baixar o arquivo de áudio
          const audioBuffer = await client.downloadFile(message.id)
          // Transcrever o áudio
          const transcription = await audioTranscriptionService.transcribe(audioBuffer)
          content = transcription
          isAudio = true
          originalAudioTranscription = transcription
        } catch (error) {
          console.error('Erro ao transcrever áudio:', error)
          // Se falhar a transcrição, pular esta mensagem
          next()
          return
        }
      } else {
        // Para mensagens de texto normais
        const bodyContent = message.body?.trim() ?? ''
        const captionContent = message.caption?.trim() ?? ''
        content = bodyContent.length > 0 ? bodyContent : captionContent
      }

      if (content.length === 0) {
        next()
        return
      }

      let senderName = message.senderName
      if (senderName === undefined || senderName.trim().length === 0) {
        if (message.sender.length > 0) {
          senderName = await client.getContactName(message.sender)
        }
      }

      let chatName = await client.getContactName(message.chatId)
      if (chatName === undefined || chatName.trim().length === 0) {
        chatName = senderName
      }

      await DirectMessagesRepositoryInstance.saveDirectMessage({
        chatExternalId: message.chatId,
        chatName,
        messageExternalId: message.id,
        senderId: message.sender,
        senderName,
        content,
        sentAt: message.sentAt ?? new Date(),
        fromMe: message.fromMe,
        isAudio,
        originalAudioTranscription
      })
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error saving group message', err)
  } finally {
    next()
  }
}
