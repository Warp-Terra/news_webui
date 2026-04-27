import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { resetNewsStore } from '@/test/resetNewsStore'
import { useNewsStore } from '../../store/newsStore'
import { Header } from './Header'

const themeMock = vi.hoisted(() => ({
  setTheme: vi.fn(),
  resolvedTheme: 'light',
}))

vi.mock('next-themes', () => ({
  useTheme: () => themeMock,
}))

describe('Header', () => {
  beforeEach(() => {
    resetNewsStore()
    themeMock.setTheme.mockClear()
    themeMock.resolvedTheme = 'light'
  })

  it('正确渲染标题', () => {
    render(<Header />)

    expect(
      screen.getByRole('heading', { name: 'Global News Intelligence Dashboard' }),
    ).toBeInTheDocument()
  })

  it('搜索输入框能输入并触发搜索回调', async () => {
    const user = userEvent.setup()
    const originalUpdateSearch = useNewsStore.getState().updateSearch
    const updateSearch = vi.fn((query: string) => originalUpdateSearch(query))
    resetNewsStore({ updateSearch })

    render(<Header />)
    const input = screen.getByRole('searchbox', { name: '搜索新闻' })

    await user.type(input, 'Reuters')

    expect(input).toHaveValue('Reuters')
    expect(updateSearch).toHaveBeenCalled()
    expect(updateSearch).toHaveBeenLastCalledWith('Reuters')
    expect(useNewsStore.getState().searchQuery).toBe('Reuters')
  })
})
