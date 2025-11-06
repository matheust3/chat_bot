export interface IAntiFloodDatasource {
  /**
   * Checa se o contato esta floodando mensagens
   */
  checkIfIsFlood: (contactId: string) => Promise<boolean>
}
