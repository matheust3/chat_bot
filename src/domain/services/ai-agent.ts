export interface IAAgent {
  handleMessage: (message: string) => Promise<string>;
}