export interface AntiFloodDatasource{
  /**
   * Checa se o contato esta floodando mensagens
   */
  checkIfIsFlood: (contactId: string) => Promise<boolean>
}
