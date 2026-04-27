import { initDb, type Database } from '@/lib/db'

export type RouteContext = { params: Promise<{ id: string }> }

export async function withDb(handler: (db: Database) => Response | Promise<Response>): Promise<Response> {
  const db = initDb()

  try {
    return await handler(db)
  } finally {
    db.close()
  }
}

export function jsonError(error: string, status: number): Response {
  return Response.json({ error }, { status })
}

export function parseCsvParam(value: string | null): string[] | undefined {
  if (!value) {
    return undefined
  }

  const values = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  return values.length > 0 ? values : undefined
}

export function parseNonNegativeIntegerParam(value: string | null, fallback: number): number {
  if (value === null) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json()

    return body !== null && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

export function parseNumericId(value: string): number | null {
  const id = Number(value)

  return Number.isInteger(id) && id > 0 ? id : null
}

export function isSqliteUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message)
}
