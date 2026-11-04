import type { WorkspaceCommand } from '../state/commands'

export interface ChangeJournalEntry {
  id: string
  revision: number
  timestamp: string
  command: WorkspaceCommand
}
