import type { ChangeJournalEntry } from '../domain/change-journal'
import type { Workspace } from '../domain/workspace'
import { parseChangeJournal } from '../persistence/change-journal'
import { applyWorkspaceCommand } from './commands'

export const replayChangeJournal = (
  baseWorkspace: Workspace,
  journal: readonly ChangeJournalEntry[] | unknown,
  baseRevision = 0,
): Workspace => {
  const workspace = structuredClone(baseWorkspace)
  for (const entry of parseChangeJournal(journal, baseRevision + 1)) {
    const result = applyWorkspaceCommand(workspace, entry.command)
    if (!result.changed) throw new Error(`Could not replay change journal revision ${entry.revision}.`)
  }
  return workspace
}
