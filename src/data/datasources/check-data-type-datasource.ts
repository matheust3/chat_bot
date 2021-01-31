import { DataType } from '../../domain/models/data-types'

export interface CheckDataTypeDatasource{
  fromBuffer: (buffer: Buffer) => Promise<DataType>
}
