import { initDb } from '@/lib/db'
import { getAiSettings } from '@/lib/db'

import { createProvider, createProviderFromConfig } from './provider'
import { toAiConfig } from './settings'
import type { AiProvider } from './types'

export function createRuntimeProvider(): AiProvider {
  const db = initDb()

  try {
    const settings = getAiSettings(db)
    if (settings) {
      return createProviderFromConfig(toAiConfig(settings))
    }
  } finally {
    db.close()
  }

  return createProvider()
}
