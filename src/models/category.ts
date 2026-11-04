import type { RecordType } from './record-type'

export interface Category {
  id: string
  name: string
  recordTypes: RecordType[]
}
