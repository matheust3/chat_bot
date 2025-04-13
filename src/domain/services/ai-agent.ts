export interface IAAgent {
  handleMessage: (message: string, userId: string) => Promise<string>
}
