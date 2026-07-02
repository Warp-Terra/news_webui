import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithI18n } from '@/test/renderWithI18n'
import { LanguageSwitcher } from './LanguageSwitcher'

const routerReplace = vi.fn()
let pathname = '/zh-CN/sources'

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace: routerReplace }),
}))

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    pathname = '/zh-CN/sources'
    routerReplace.mockClear()
  })

  it('renders current locale and switches while preserving page path', async () => {
    const user = userEvent.setup()

    renderWithI18n(<LanguageSwitcher />)

    await user.selectOptions(screen.getByLabelText('界面语言'), 'en-US')

    expect(routerReplace).toHaveBeenCalledWith('/en-US/sources')
  })

  it('shows English accessible label under English locale', () => {
    renderWithI18n(<LanguageSwitcher />, { locale: 'en-US' })

    expect(screen.getByLabelText('Interface language')).toBeInTheDocument()
  })

  it('renders the language select visibly so users can switch language', () => {
    renderWithI18n(<LanguageSwitcher />)

    const select = screen.getByRole('combobox')
    const container = select.parentElement

    expect(container?.className).not.toContain('sr-only')
  })
})
