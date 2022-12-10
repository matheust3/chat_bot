export interface IMessage {
  readonly body: string
  readonly isCommand: boolean
  reply: (body: string) => Promise<IMessage>
}
