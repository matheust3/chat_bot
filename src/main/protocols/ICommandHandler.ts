import { IClient } from './IClient'
import { IMessage } from './IMessage'

export type ICommandHandler = (message: IMessage, client: IClient) => Promise<void>
