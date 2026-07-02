import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithI18n } from '@/test/renderWithI18n'
import { LanguageSwitcher } from './LanguageSwitcher'

const routerReplace = vi.fn()
const { replaceLocation } = vi.hoisted(() => ({
  replaceLocation: vi.fn(),
}))
let pathname = '/zh-CN/sources'

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace: routerReplace }),
}))

vi.mock('@/app/i18n/navigate', () => ({
  replaceLocation: replaceLocation,
}))

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    pathname = '/zh-CN/sources'
    routerReplace.mockClear()
    replaceLocation.mockClear()
  })

  it('switches locale via full document navigation, not client-side router', async () => {
    const user = userEvent.setup()

    renderWithI18n(<LanguageSwitcher />)

    await user.selectOptions(screen.getByLabelText('界面语言'), 'en-US')

    expect(routerReplace).not.toHaveBeenCalled()
    expect(replaceLocation).toHaveBeenCalledWith('/en-US/sources')
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
