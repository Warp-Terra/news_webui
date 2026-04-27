export const DEFAULT_AI_REQUEST_TIMEOUT_MS = 30_000

export function getAiRequestTimeoutMs(): number {
  return parseOptionalPositiveInteger(
    process.env.AI_REQUEST_TIMEOUT_MS,
    DEFAULT_AI_REQUEST_TIMEOUT_MS,
    'AI_REQUEST_TIMEOUT_MS',
  )
}

function parseOptionalPositiveInteger(value: string | undefined, defaultValue: number, envName: string): number {
  const normalized = normalizeEnv(value)

  if (!normalized) {
    return defaultValue
  }

  const parsed = Number(normalized)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${envName} must be a positive integer.`)
  }

  return parsed
}

function normalizeEnv(value: string | undefined): string | undefined {
  const normalized = value?.trim()

  return normalized && normalized.length > 0 ? normalized : undefined
}
