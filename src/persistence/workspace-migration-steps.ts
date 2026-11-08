type JsonObject = Record<string, unknown>

const isObject = (value: unknown): value is JsonObject => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const migrateMapping = (value: unknown): unknown => {
  if (!isObject(value)) return value
  const nested = Array.isArray(value.mappings) ? value.mappings : Array.isArray(value.loops) ? value.loops : []
  const { loops: _legacyLoops, ...mapping } = value
  return {
    ...mapping,
    kind: value.kind === 'object' || value.kind === 'field' ? value.kind : 'loop',
    mappings: nested.map(migrateMapping),
  }
}

const v8ToV9 = (workspace: JsonObject) => {
  const middleware = isObject(workspace.middleware) && Array.isArray(workspace.middleware.items)
    ? workspace.middleware.items
    : []
  for (const item of middleware) {
    if (!isObject(item) || !Array.isArray(item.categories)) continue
    for (const category of item.categories) {
      if (!isObject(category) || category.kind !== 'pipelines' || !Array.isArray(category.items)) continue
      for (const pipeline of category.items) {
        if (!isObject(pipeline) || !isObject(pipeline.transform)) continue
        const stored = pipeline.transform.mappings ?? pipeline.transform.loops
        pipeline.transform = { mappings: Array.isArray(stored) ? stored.map(migrateMapping) : [] }
      }
    }
  }
  workspace.schemaVersion = 9
  return workspace
}

const v9ToV10 = (workspace: JsonObject) => {
  const topLevels = Array.isArray(workspace.topLevels)
    ? workspace.topLevels.filter(isObject)
    : []
  const recordTypes = topLevels.find(({ id }) => id === 'record-types') ?? {
    id: 'record-types', label: 'Record Types',
  }
  const dataTypes = topLevels.find(({ id }) => id === 'data-types') ?? {
    id: 'data-types', label: 'Data Types',
  }
  const serialized = topLevels.find(({ id }) => id === 'serialized') ?? {
    id: 'serialized', label: 'Serialized',
  }
  const standardRemaining = [
    { id: 'applications', label: 'Applications' },
    { id: 'middleware', label: 'Middleware' },
    { id: 'data-flows', label: 'Data Flows' },
  ].map((fallback) => topLevels.find(({ id }) => id === fallback.id) ?? fallback)
  const knownIds = new Set([
    'record-types', 'data-types', 'serialized', 'canonical-model',
    'applications', 'middleware', 'data-flows',
  ])
  const additional = topLevels.filter(({ id }) => !knownIds.has(String(id)))
  workspace.topLevels = [{
    id: 'canonical-model',
    label: 'Canonical Model',
    children: [recordTypes, dataTypes, serialized],
  }, ...standardRemaining, ...additional]
  workspace.schemaVersion = 10
  return workspace
}

const v10ToV11 = (workspace: JsonObject) => {
  const topLevels = Array.isArray(workspace.topLevels) ? workspace.topLevels.filter(isObject) : []
  const canonicalModel = topLevels.find(({ id }) => id === 'canonical-model')
  const canonicalChildren = canonicalModel && Array.isArray(canonicalModel.children)
    ? canonicalModel.children.filter(isObject)
    : []
  const serialized = canonicalChildren.find(({ id }) => id === 'serialized')
  if (serialized) {
    serialized.children = [
      {
        id: 'api-payloads',
        label: 'API Payloads',
        children: [{ id: 'request-from-source', label: 'Request From Source' }],
      },
      {
        id: 'middleware-canonical',
        label: 'Middleware Canonical',
        children: [
          { id: 'from-source', label: 'From Source' },
          { id: 'middleware-serialized', label: 'Middleware' },
          { id: 'to-target', label: 'To Target' },
        ],
      },
      {
        id: 'client-payloads',
        label: 'CLIENT Payloads',
        children: [
          { id: 'response-from-source', label: 'Response From Source' },
          { id: 'request-to-target', label: 'Request To Target' },
        ],
      },
    ]
  }
  workspace.schemaVersion = 11
  return workspace
}

const v11ToV12 = (workspace: JsonObject) => {
  const topLevels = Array.isArray(workspace.topLevels) ? workspace.topLevels.filter(isObject) : []
  const canonicalModel = topLevels.find(({ id }) => id === 'canonical-model')
  const canonicalChildren = canonicalModel && Array.isArray(canonicalModel.children)
    ? canonicalModel.children.filter(isObject)
    : []
  const serialized = canonicalChildren.find(({ id }) => id === 'serialized')
  const serializedChildren = serialized && Array.isArray(serialized.children)
    ? serialized.children.filter(isObject)
    : []
  const middlewarePayloads = serializedChildren.find(({ id }) => id === 'middleware-canonical')
  if (middlewarePayloads) middlewarePayloads.label = 'Middleware Payloads'
  workspace.schemaVersion = 12
  return workspace
}

export const applyWorkspaceMigrationSteps = (value: JsonObject, version: number) => {
  const workspace = structuredClone(value)
  let currentVersion = version
  if (currentVersion < 9) {
    v8ToV9(workspace)
    currentVersion = 9
  }
  if (currentVersion < 10) {
    v9ToV10(workspace)
    currentVersion = 10
  }
  if (currentVersion < 11) {
    v10ToV11(workspace)
    currentVersion = 11
  }
  if (currentVersion < 12) {
    v11ToV12(workspace)
    currentVersion = 12
  }
  return workspace
}
