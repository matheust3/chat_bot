import { IClient } from './IClient'
import { IMessage } from './IMessage'

export type IMiddlewareHandler = (message: IMessage, client: IClient, next: () => void) => Promise<void>
