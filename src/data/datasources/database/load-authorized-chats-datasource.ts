export interface LoadAuthorizedChatsDatasource{
  /**
   * Le a lista de chats autorizados
   *
   * @returns {@link string[] | string[]} lista de ids dos chats autorizados
   */
  load: () => string[]
}
