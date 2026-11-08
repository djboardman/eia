import type { PipelineTransformMapping, PipelineTransformMappingKind } from '../../domain/workspace'

export const createTransformMapping = (kind: PipelineTransformMappingKind): PipelineTransformMapping => ({
  definitionId: crypto.randomUUID(),
  kind,
  sourcePath: '',
  targetPath: '',
  mappings: [],
})

export const findTransformMapping = (
  mappings: PipelineTransformMapping[],
  definitionId: string,
): PipelineTransformMapping | undefined => {
  for (const mapping of mappings) {
    if (mapping.definitionId === definitionId) return mapping
    const nested = findTransformMapping(mapping.mappings, definitionId)
    if (nested) return nested
  }
  return undefined
}

export const deleteTransformMapping = (mappings: PipelineTransformMapping[], definitionId: string): boolean => {
  const index = mappings.findIndex((mapping) => mapping.definitionId === definitionId)
  if (index >= 0) {
    mappings.splice(index, 1)
    return true
  }
  return mappings.some((mapping) => deleteTransformMapping(mapping.mappings, definitionId))
}

export const clearNestedMappingPath = (
  mappings: PipelineTransformMapping[],
  field: 'sourcePath' | 'targetPath',
) => {
  for (const mapping of mappings) {
    mapping[field] = ''
    clearNestedMappingPath(mapping.mappings, field)
  }
}
