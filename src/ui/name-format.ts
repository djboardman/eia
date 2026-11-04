export const upperCamelCaseNamePattern = /^[A-Z][A-Za-z0-9]*$/

export const toUpperCamelCase = (value: string) =>
  value
    .trim()
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('')
