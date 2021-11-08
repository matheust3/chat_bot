import { BanLogData } from '../../domain/models/ban-log-data'

export interface BanLogsDatasource{
  /**
   * Registra um banimento nos logs
   * @param contactId O id do contato banido
   * @param log O motivo do banimento (ex: spam, admin, link...)
   */
  registryBan: (contactId: string, log: string) => Promise<void>

  /**
   * Retorna o log de um banimento ou null se nao tem log
   * @param contactId Id do contato banido
   */
  getBanLog: (contactId: string) => Promise<BanLogData[] >
}
