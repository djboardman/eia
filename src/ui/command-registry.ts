export interface CommandDefinition {
  id: string
  label: string
  execute: () => void
}

export class CommandRegistry {
  private readonly commands = new Map<string, CommandDefinition>()

  register(command: CommandDefinition) {
    this.commands.set(command.id, command)
  }

  get(id: string) {
    return this.commands.get(id)
  }

  execute(id: string) {
    this.commands.get(id)?.execute()
  }
}
