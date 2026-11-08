export const routes = {
  recordTypes: '#record-types',
  dataTypes: '#data-types',
  recordType: (definitionId: string) => `#record-types/record-type/${definitionId}`,
  stringSubtype: (definitionId: string) => `#data-types/string/${definitionId}`,
  api: (scopeId: string, definitionId: string) => `#applications/data-scope/${scopeId}/api/${definitionId}`,
  pipeline: (middlewareId: string, definitionId: string) => `#middleware/${middlewareId}/pipeline/${definitionId}`,
} as const

export const currentRoute = () => window.location.hash || routes.recordTypes

export const navigate = (route: string) => {
  window.location.hash = route.startsWith('#') ? route.slice(1) : route
}
