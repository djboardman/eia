import type { Workspace } from './workspace'

export interface StringDataTypeSubtype {
  definitionId: string
  name: string
  pattern: string
  example: string
  description: string
}

export const basicDataTypeDefinitionId = (name: string) => `json:${name}`

export const dataTypeDefinitionIdForLegacyName = (
  name: string,
  stringSubtypes: StringDataTypeSubtype[],
) => stringSubtypes.find((subtype) => subtype.name === name)?.definitionId ?? basicDataTypeDefinitionId(name)

export const resolveDataTypeName = (workspace: Workspace, definitionId: string) => {
  if (definitionId.startsWith('json:')) return definitionId.slice(5)
  return workspace.dataTypes.stringSubtypes.find((subtype) => subtype.definitionId === definitionId)?.name
}

export const getDataTypeOptions = (workspace: Workspace) => ({
  basic: workspace.dataTypes.basic.map((name) => ({
    definitionId: basicDataTypeDefinitionId(name),
    name,
  })),
  stringSubtypes: workspace.dataTypes.stringSubtypes.map(({ definitionId, name }) => ({
    definitionId,
    name,
  })),
})
