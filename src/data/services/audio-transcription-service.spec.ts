import { AudioTranscriptionServiceImpl } from './audio-transcription-service'
import { AudioTranscriptionDatasource } from '../datasources/audio-transcription-datasource'
import { mock, MockProxy } from 'jest-mock-extended'

describe('AudioTranscriptionServiceImpl', () => {
  let service: AudioTranscriptionServiceImpl
  let mockDatasource: MockProxy<AudioTranscriptionDatasource>

  beforeEach(() => {
    mockDatasource = mock<AudioTranscriptionDatasource>()
    service = new AudioTranscriptionServiceImpl(mockDatasource)
  })

  it('should create an instance', () => {
    expect(service).toBeDefined()
  })

  it('should call datasource transcribe method', async () => {
    const audioBuffer = Buffer.from('audio data')
    const expectedTranscription = 'Texto transcrito'
    
    mockDatasource.transcribe.mockResolvedValue(expectedTranscription)

    const result = await service.transcribe(audioBuffer)

    expect(mockDatasource.transcribe).toHaveBeenCalledWith(audioBuffer)
    expect(result).toBe(expectedTranscription)
  })

  it('should propagate errors from datasource', async () => {
    const audioBuffer = Buffer.from('audio data')
    const error = new Error('Falha ao transcrever')
    
    mockDatasource.transcribe.mockRejectedValue(error)

    await expect(service.transcribe(audioBuffer)).rejects.toThrow('Falha ao transcrever')
  })
})
