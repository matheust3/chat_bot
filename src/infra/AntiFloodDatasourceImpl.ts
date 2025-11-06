import { IAntiFloodDatasource } from '../data/datasources/IAntiFloodDatasource'

export class AntiFloodDatasourceImpl implements IAntiFloodDatasource {
  private readonly _floodMap: Map<string, number[]>
  private readonly _msgPerMinute: number
  private readonly _timeLimit: number
  private readonly _maxRecords: number // Número máximo de registros permitidos por usuário

  constructor (msgPerMinute: number) {
    this._timeLimit = 60000 // 1 min
    this._msgPerMinute = msgPerMinute
    this._maxRecords = msgPerMinute * 2 // Número máximo de registros permitidos por usuário
    this._floodMap = new Map<string, number[]>()
  }

  async checkIfIsFlood (contactId: string): Promise<boolean> {
    const currentTime = Date.now()
    // check if user is in floodMap
    if (!this._floodMap.has(contactId)) {
      this._floodMap.set(contactId, [currentTime]) // Cria um registro para o usuário com o tempo atual
      return false
    } else {
      const messageTimes = this._floodMap.get(contactId) ?? []
      const eligibleMessages = messageTimes.filter(time => currentTime - time < this._timeLimit)

      if (eligibleMessages.length >= this._msgPerMinute) {
        return true // Se o número de mensagens elegíveis exceder o limite, há um flood
      }

      messageTimes.push(currentTime) // Adiciona o tempo da mensagem atual ao registro do usuário
      this._floodMap.set(contactId, messageTimes)

      // Verifica se o número de registros ultrapassou o máximo e remove os mais antigos
      if (messageTimes.length > this._maxRecords) {
        const messagesToKeep = messageTimes.slice(-this._maxRecords)
        this._floodMap.set(contactId, messagesToKeep)
      }

      return false // Não há flood
    }
  }
}
