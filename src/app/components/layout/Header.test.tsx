import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithI18n } from '@/test/renderWithI18n'
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

const navigationMock = vi.hoisted(() => ({
  pathname: '/zh-CN/sources',
  replace: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => navigationMock.pathname,
  useRouter: () => ({ replace: navigationMock.replace }),
}))

describe('Header', () => {
  beforeEach(() => {
    resetNewsStore()
    themeMock.setTheme.mockClear()
    themeMock.resolvedTheme = 'light'
    navigationMock.replace.mockClear()
  })

  it('正确渲染标题', () => {
    renderWithI18n(<Header />, { locale: 'en-US' })

    expect(
      screen.getByRole('heading', { name: 'Global News Intelligence Dashboard' }),
    ).toBeInTheDocument()
  })

  it('搜索输入框能输入并触发搜索回调', async () => {
    const user = userEvent.setup()
    const originalUpdateSearch = useNewsStore.getState().updateSearch
    const updateSearch = vi.fn((query: string) => originalUpdateSearch(query))
    resetNewsStore({ updateSearch })

    renderWithI18n(<Header />)
    const input = screen.getByRole('searchbox', { name: '搜索新闻' })

    await user.type(input, 'Reuters')

    expect(input).toHaveValue('Reuters')
    expect(updateSearch).toHaveBeenCalled()
    expect(updateSearch).toHaveBeenLastCalledWith('Reuters')
    expect(useNewsStore.getState().searchQuery).toBe('Reuters')
  })
})
