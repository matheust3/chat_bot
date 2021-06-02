import { GhostData } from '../../domain/models/ghost-data'

export interface LoadGhostDataDatasource{
  load: () => Promise<GhostData>
}
