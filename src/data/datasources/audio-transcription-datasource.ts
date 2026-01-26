export interface AudioTranscriptionDatasource {
  transcribe: (audioBuffer: Buffer) => Promise<string>
}
