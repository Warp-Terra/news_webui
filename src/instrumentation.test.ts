import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const originalNextRuntime = process.env.NEXT_RUNTIME

describe('instrumentation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete globalThis.__rssCronRegistered
    delete globalThis.__rssCronTask

    vi.doMock('node-cron', () => ({
      default: {
        schedule: vi.fn(() => ({ stop: vi.fn() })),
      },
      schedule: vi.fn(() => ({ stop: vi.fn() })),
    }))

    vi.doMock('./lib/db', () => ({
      initDb: vi.fn(() => ({ mockDb: true })),
    }))

    vi.doMock('./lib/rss', () => ({
      fetchAllSources: vi.fn(() => Promise.resolve({ fetched: 5, errors: [] })),
    }))
  })

  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    delete globalThis.__rssCronRegistered
    delete globalThis.__rssCronTask

    if (originalNextRuntime === undefined) {
      delete process.env.NEXT_RUNTIME
    } else {
      process.env.NEXT_RUNTIME = originalNextRuntime
    }
  })

  it('should register cron job in nodejs runtime', async () => {
    process.env.NEXT_RUNTIME = 'nodejs'

    const { register } = await import('./instrumentation')
    const cron = await import('node-cron')
    await register()

    expect(cron.schedule).toHaveBeenCalledTimes(1)
    expect(cron.schedule).toHaveBeenCalledWith('*/30 * * * *', expect.any(Function))
  })

  it('should not register in edge runtime', async () => {
    process.env.NEXT_RUNTIME = 'edge'

    const { register } = await import('./instrumentation')
    const cron = await import('node-cron')
    await register()

    expect(cron.schedule).not.toHaveBeenCalled()
  })

  it('should not register twice', async () => {
    process.env.NEXT_RUNTIME = 'nodejs'

    const { register } = await import('./instrumentation')
    const cron = await import('node-cron')
    await register()
    await register()

    expect(cron.schedule).toHaveBeenCalledTimes(1)
  })

  it('should call fetchAllSources immediately and when cron fires', async () => {
    process.env.NEXT_RUNTIME = 'nodejs'

    const { register } = await import('./instrumentation')
    const cron = await import('node-cron')
    const { fetchAllSources } = await import('./lib/rss')
    const { initDb } = await import('./lib/db')
    await register()

    expect(fetchAllSources).toHaveBeenCalledTimes(1)
    expect(fetchAllSources).toHaveBeenCalledWith({ mockDb: true })
    expect(initDb).toHaveBeenCalledTimes(1)

    const capturedCallback = vi.mocked(cron.schedule).mock.calls[0][1]
    expect(capturedCallback).toEqual(expect.any(Function))
    ;(capturedCallback as () => void)()
    await vi.waitFor(() => expect(fetchAllSources).toHaveBeenCalledTimes(2))
  })
})
