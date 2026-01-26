export interface AudioTranscriptionService {
  transcribe: (audioBuffer: Buffer) => Promise<string>
}
