import { GroqAudioTranscriptionDatasource } from './groq-audio-transcription-datasource'
import fs from 'fs'

// Mock do módulo fs para evitar operações reais de arquivo durante os testes
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  createReadStream: jest.fn().mockReturnValue({
    path: '/fake/path',
    on: jest.fn(),
    pipe: jest.fn()
  }),
  readdirSync: jest.fn().mockReturnValue([])
}))

// Mock do Groq SDK
jest.mock('groq-sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      audio: {
        transcriptions: {
          create: jest.fn().mockResolvedValue({
            text: 'Texto transcrito de teste'
          })
        }
      }
    }))
  }
})

describe('GroqAudioTranscriptionDatasource', () => {
  let datasource: GroqAudioTranscriptionDatasource

  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-api-key'
    datasource = new GroqAudioTranscriptionDatasource()
    jest.clearAllMocks()
  })

  afterEach(() => {
    process.env.GROQ_API_KEY = ''
  })

  it('should create an instance', () => {
    expect(datasource).toBeDefined()
  })

  it('should have transcribe method', () => {
    expect(datasource.transcribe).toBeDefined()
    expect(typeof datasource.transcribe).toBe('function')
  })

  it('should return transcription text', async () => {
    const audioBuffer = Buffer.from('fake audio data')

    const result = await datasource.transcribe(audioBuffer)

    expect(result).toBe('Texto transcrito de teste')
    expect(fs.writeFileSync).toHaveBeenCalled()
    expect(fs.createReadStream).toHaveBeenCalled()
  })

  it('should clean up temporary file after transcription', async () => {
    const audioBuffer = Buffer.from('fake audio data')

    await datasource.transcribe(audioBuffer)

    expect(fs.unlinkSync).toHaveBeenCalled()
  })
})
