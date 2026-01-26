export interface GroupSummaryCheckpointDatasource {
  getLastSummarizedAt: (groupExternalId: string) => Promise<Date | null>
  setLastSummarizedAt: (groupExternalId: string, lastSummarizedAt: Date) => Promise<void>
}
