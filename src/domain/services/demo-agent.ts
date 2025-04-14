export interface DemoAgent {
  handleMessage: (message: string, userId: string) => Promise<string>
}
