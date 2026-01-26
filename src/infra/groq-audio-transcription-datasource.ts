import Groq from 'groq-sdk'
import { AudioTranscriptionDatasource } from '../data/datasources/audio-transcription-datasource'
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export class GroqAudioTranscriptionDatasource implements AudioTranscriptionDatasource {
  private readonly client: Groq

  constructor () {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY
    })
  }

  async transcribe (audioBuffer: Buffer): Promise<string> {
    // Criar pasta temporária se não existir
    const tempDir = path.join(__dirname, '../../cache')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // Salvar o buffer em um arquivo temporário
    const tempFileName = `audio_${uuidv4()}.ogg`
    const tempFilePath = path.join(tempDir, tempFileName)

    try {
      fs.writeFileSync(tempFilePath, audioBuffer)

      // Criar um ReadStream do arquivo
      const fileStream = fs.createReadStream(tempFilePath)

      // Fazer a transcrição usando a API do Groq
      const transcription = await this.client.audio.transcriptions.create({
        file: fileStream,
        model: 'whisper-large-v3-turbo',
        language: 'pt',
        response_format: 'json'
      })

      return transcription.text.trim()
    } catch (error) {
      console.error('Erro ao transcrever áudio:', error)
      throw new Error('Falha ao transcrever áudio')
    } finally {
      // Remover o arquivo temporário
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath)
      }
    }
  }
}
