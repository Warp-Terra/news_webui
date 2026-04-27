import type { ImportanceLevel } from '@/app/types/news'

import type { AiSummaryResult } from './summarize'

const IMPORTANCE_LEVELS = new Set<ImportanceLevel>(['low', 'medium', 'high', 'critical'])

export interface AggregationResult {
  theme: string
  summary: string
  keyPoints: string[]
  impact: string
}

export function extractJsonFromMarkdown(text: string): unknown {
  const trimmed = text.trim()

  if (trimmed.length === 0) {
    return {}
  }

  const candidates = collectJsonCandidates(trimmed)

  for (const candidate of candidates) {
    const parsed = tryParseJson(candidate)

    if (parsed !== undefined) {
      return parsed
    }
  }

  return {}
}

export function parseAiSummary(raw: unknown): AiSummaryResult {
  const object = asRecord(raw)

  return {
    summary: getString(object.summary),
    keyPoints: getStringArray(object.keyPoints),
    impact: getString(object.impact),
    importance: getImportance(object.importance),
    tags: getStringArray(object.tags),
    tokensIn: getNonNegativeInteger(object.tokensIn),
    tokensOut: getNonNegativeInteger(object.tokensOut),
  }
}

export function parseAggregationResult(raw: unknown): AggregationResult {
  const object = asRecord(raw)

  return {
    theme: getString(object.theme),
    summary: getString(object.summary),
    keyPoints: getStringArray(object.keyPoints),
    impact: getString(object.impact),
  }
}

function collectJsonCandidates(text: string): string[] {
  const candidates: string[] = [text]
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/gi
  let match: RegExpExecArray | null

  while ((match = codeBlockRegex.exec(text)) !== null) {
    candidates.push(match[1].trim())
  }

  const objectCandidate = extractBalancedJson(text, '{', '}')
  if (objectCandidate) {
    candidates.push(objectCandidate)
  }

  const arrayCandidate = extractBalancedJson(text, '[', ']')
  if (arrayCandidate) {
    candidates.push(arrayCandidate)
  }

  return candidates
}

function extractBalancedJson(text: string, openChar: '{' | '[', closeChar: '}' | ']'): string | null {
  const start = text.indexOf(openChar)

  if (start === -1) {
    return null
  }

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < text.length; index += 1) {
    const char = text[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) {
      continue
    }

    if (char === openChar) {
      depth += 1
    } else if (char === closeChar) {
      depth -= 1

      if (depth === 0) {
        return text.slice(start, index + 1)
      }
    }
  }

  return null
}

function tryParseJson(candidate: string): unknown | undefined {
  try {
    return JSON.parse(candidate)
  } catch {
    return undefined
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : []
}

function getImportance(value: unknown): ImportanceLevel {
  return typeof value === 'string' && IMPORTANCE_LEVELS.has(value as ImportanceLevel)
    ? (value as ImportanceLevel)
    : 'medium'
}

function getNonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0
}
