import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { NewsSource } from '@/lib/api'
import { renderWithI18n } from '@/test/renderWithI18n'
import SourcesPage from './page'
import {
  createSource,
  deleteSource,
  fetchSourcesList,
  updateSource,
} from '@/lib/api'

vi.mock('@/lib/api', () => ({
  fetchSourcesList: vi.fn(),
  createSource: vi.fn(),
  updateSource: vi.fn(),
  deleteSource: vi.fn(),
}))

const mockedFetchSourcesList = vi.mocked(fetchSourcesList)
const mockedCreateSource = vi.mocked(createSource)
const mockedUpdateSource = vi.mocked(updateSource)
const mockedDeleteSource = vi.mocked(deleteSource)

const initialSources: NewsSource[] = [
  {
    id: 1,
    name: 'Reuters Top News',
    url: 'https://www.reutersagency.com/feed/',
    region: 'Global',
    category: 'Politics',
    active: true,
    lastFetchedAt: '2026-04-23T10:00:00.000Z',
  },
  {
    id: 2,
    name: 'Nikkei Asia',
    url: 'https://asia.nikkei.com/rss/feed/nar',
    region: 'JP',
    category: 'Economy',
    active: false,
    lastFetchedAt: null,
  },
]

describe('SourcesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedFetchSourcesList.mockResolvedValue(initialSources)
    mockedCreateSource.mockImplementation(async (data) => ({ id: 3, ...data }))
    mockedUpdateSource.mockResolvedValue(undefined)
    mockedDeleteSource.mockResolvedValue(undefined)
  })

  it('渲染数据源列表和返回 Dashboard 链接', async () => {
    renderWithI18n(<SourcesPage />)

    expect(screen.getByRole('heading', { name: '数据源管理' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /返回 Dashboard/ })).toHaveAttribute('href', '/zh-CN')
    expect(await screen.findByText('Reuters Top News')).toBeInTheDocument()
    expect(screen.getByText('https://www.reutersagency.com/feed/')).toBeInTheDocument()
    expect(screen.getByText('全球')).toBeInTheDocument()
    expect(screen.getByText('政治')).toBeInTheDocument()
    expect(screen.getByText('启用')).toBeInTheDocument()
    expect(screen.getByText('停用')).toBeInTheDocument()
    expect(screen.getByText('2026/04/23 18:00')).toBeInTheDocument()
    expect(screen.getByText('从未抓取')).toBeInTheDocument()
  })

  it('添加数据源时校验必填字段并显示错误', async () => {
    const user = userEvent.setup()
    renderWithI18n(<SourcesPage />)
    await screen.findByText('Reuters Top News')

    await user.click(screen.getByRole('button', { name: '新增数据源' }))
    await user.click(screen.getByRole('button', { name: '保存数据源' }))

    expect(screen.getByText('请填写名称')).toBeInTheDocument()
    expect(screen.getByText('请填写 RSS URL')).toBeInTheDocument()
    expect(mockedCreateSource).not.toHaveBeenCalled()
  })

  it('添加数据源成功后调用 API 并刷新列表', async () => {
    const user = userEvent.setup()
    const created: NewsSource = {
      id: 3,
      name: 'BBC World',
      url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
      region: 'EU',
      category: 'Politics',
      active: true,
      lastFetchedAt: null,
    }
    mockedCreateSource.mockResolvedValueOnce(created)
    mockedFetchSourcesList.mockResolvedValueOnce(initialSources).mockResolvedValueOnce([...initialSources, created])

    renderWithI18n(<SourcesPage />)
    await screen.findByText('Reuters Top News')
    await user.click(screen.getByRole('button', { name: '新增数据源' }))
    await user.type(screen.getByLabelText('名称'), 'BBC World')
    await user.type(screen.getByLabelText('RSS URL'), 'https://feeds.bbci.co.uk/news/world/rss.xml')
    await user.selectOptions(screen.getByLabelText('地区'), 'EU')
    await user.selectOptions(screen.getByLabelText('分类'), 'Politics')
    await user.click(screen.getByRole('button', { name: '保存数据源' }))

    await waitFor(() =>
      expect(mockedCreateSource).toHaveBeenCalledWith({
        name: 'BBC World',
        url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
        region: 'EU',
        category: 'Politics',
        active: true,
        lastFetchedAt: null,
      }),
    )
    await waitFor(() => expect(mockedFetchSourcesList).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('BBC World')).toBeInTheDocument()
  })

  it('编辑数据源成功后调用 API 并刷新列表', async () => {
    const user = userEvent.setup()
    const updated: NewsSource = {
      ...initialSources[0],
      name: 'Reuters World',
      active: false,
    }
    mockedFetchSourcesList.mockResolvedValueOnce(initialSources).mockResolvedValueOnce([
      updated,
      initialSources[1],
    ])

    renderWithI18n(<SourcesPage />)
    const sourceCard = await screen.findByRole('article', { name: 'Reuters Top News' })

    await user.click(within(sourceCard).getByRole('button', { name: '编辑 Reuters Top News' }))
    const nameInput = screen.getByLabelText('名称')
    await user.clear(nameInput)
    await user.type(nameInput, 'Reuters World')
    await user.click(screen.getByRole('button', { name: '启用' }))
    await user.click(screen.getByRole('button', { name: '保存数据源' }))

    await waitFor(() =>
      expect(mockedUpdateSource).toHaveBeenCalledWith(1, {
        name: 'Reuters World',
        url: 'https://www.reutersagency.com/feed/',
        region: 'Global',
        category: 'Politics',
        active: false,
        lastFetchedAt: '2026-04-23T10:00:00.000Z',
      }),
    )
    expect(await screen.findByText('Reuters World')).toBeInTheDocument()
  })

  it('删除数据源成功后调用 API 并刷新列表', async () => {
    const user = userEvent.setup()
    mockedFetchSourcesList.mockResolvedValueOnce(initialSources).mockResolvedValueOnce([initialSources[1]])

    renderWithI18n(<SourcesPage />)
    const sourceCard = await screen.findByRole('article', { name: 'Reuters Top News' })

    await user.click(within(sourceCard).getByRole('button', { name: '删除 Reuters Top News' }))

    await waitFor(() => expect(mockedDeleteSource).toHaveBeenCalledWith(1))
    await waitFor(() => expect(screen.queryByText('Reuters Top News')).not.toBeInTheDocument())
  })

  it('URL 格式非法时显示表单验证错误', async () => {
    const user = userEvent.setup()
    renderWithI18n(<SourcesPage />)
    await screen.findByText('Reuters Top News')

    await user.click(screen.getByRole('button', { name: '新增数据源' }))
    await user.type(screen.getByLabelText('名称'), 'Invalid Feed')
    await user.type(screen.getByLabelText('RSS URL'), 'not-a-url')
    await user.click(screen.getByRole('button', { name: '保存数据源' }))

    expect(screen.getByText('请输入合法 URL')).toBeInTheDocument()
    expect(mockedCreateSource).not.toHaveBeenCalled()
  })

  it('英文语言下显示英文数据源页面文案', async () => {
    renderWithI18n(<SourcesPage />, { locale: 'en-US' })

    expect(await screen.findByText('Source Management')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add Source/ })).toBeInTheDocument()
  })
})
