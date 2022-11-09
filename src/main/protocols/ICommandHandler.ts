import { IMessage } from './IMessage'

export type ICommandHandler = (message: IMessage) => Promise<void>
