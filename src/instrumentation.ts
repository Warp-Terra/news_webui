import type { ScheduledTask } from 'node-cron'

declare global {
  var __rssCronRegistered: boolean | undefined
  var __rssCronTask: ScheduledTask | undefined
}

const RSS_FETCH_CRON_EXPRESSION = '*/30 * * * *'

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }

  if (globalThis.__rssCronRegistered) {
    return
  }

  globalThis.__rssCronRegistered = true

  try {
    const { initDb } = await import('./lib/db')
    const { fetchAllSources } = await import('./lib/rss')
    const cron = await import('node-cron')
    const db = initDb()

    const fetchRssSources = () => {
      console.log('[Cron] Starting RSS fetch...')

      fetchAllSources(db)
        .then((result) => {
          console.log('[Cron] RSS fetch completed:', result)
        })
        .catch((error: unknown) => {
          console.error('[Cron] RSS fetch failed:', error)
        })
    }

    globalThis.__rssCronTask = cron.schedule(RSS_FETCH_CRON_EXPRESSION, fetchRssSources)
    console.log('[Cron] RSS fetch scheduled every 30 minutes')

    fetchRssSources()
  } catch (error) {
    globalThis.__rssCronRegistered = false
    console.error('[Cron] Failed to register RSS fetch cron job:', error)
  }
}

