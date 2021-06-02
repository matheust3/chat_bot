import { GhostData } from '../../domain/models/ghost-data'

export interface SaveGhostDataDatasource{
  save: (data: GhostData) => Promise<void>
}
