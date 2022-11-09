import { IMessage } from './IMessage'

export type ICommand = (message: IMessage) => Promise<void>
