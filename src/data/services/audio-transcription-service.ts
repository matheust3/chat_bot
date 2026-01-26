import { AudioTranscriptionDatasource } from '../datasources/audio-transcription-datasource'

export interface AudioTranscriptionService {
  transcribe: (audioBuffer: Buffer) => Promise<string>
}

export class AudioTranscriptionServiceImpl implements AudioTranscriptionService {
  constructor (private readonly datasource: AudioTranscriptionDatasource) {}

  async transcribe (audioBuffer: Buffer): Promise<string> {
    return await this.datasource.transcribe(audioBuffer)
  }
}
