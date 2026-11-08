import { describe, expect, it } from 'vitest'
import type { PipelineTransformMapping } from '../../domain/workspace'
import { clearNestedMappingPath, deleteTransformMapping, findTransformMapping } from './transform-operations'

const mappings = (): PipelineTransformMapping[] => [{
  definitionId: 'parent',
  kind: 'object',
  sourcePath: 'source',
  targetPath: 'target',
  mappings: [{
    definitionId: 'child',
    kind: 'field',
    sourcePath: 'source.name',
    targetPath: 'target.name',
    mappings: [],
  }],
}]

describe('pipeline transform operations', () => {
  it('finds and deletes nested mappings', () => {
    const value = mappings()
    expect(findTransformMapping(value, 'child')?.targetPath).toBe('target.name')
    expect(deleteTransformMapping(value, 'child')).toBe(true)
    expect(value[0].mappings).toEqual([])
  })

  it('clears one side of all descendants', () => {
    const value = mappings()
    clearNestedMappingPath(value, 'sourcePath')
    expect(value[0].sourcePath).toBe('')
    expect(value[0].targetPath).toBe('target')
    expect(value[0].mappings[0].sourcePath).toBe('')
  })
})
