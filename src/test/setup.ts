import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'
import type { HTMLAttributes } from 'react'

type MockDivProps = HTMLAttributes<HTMLDivElement>

vi.mock('@/components/ui/scroll-area', async () => {
  const React = await import('react')

  return {
    ScrollArea: ({ children, className, ...props }: MockDivProps) =>
      React.createElement('div', { ...props, className, 'data-slot': 'scroll-area' }, children),
    ScrollBar: ({ className, ...props }: MockDivProps) =>
      React.createElement('div', {
        ...props,
        className,
        'data-slot': 'scroll-area-scrollbar',
      }),
  }
})

class ResizeObserverMock implements ResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserverMock,
})
