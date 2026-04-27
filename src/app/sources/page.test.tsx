import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { NewsSource } from '@/lib/api'
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
    render(<SourcesPage />)

    expect(screen.getByRole('heading', { name: '数据源管理' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /返回 Dashboard/ })).toHaveAttribute('href', '/')
    expect(await screen.findByText('Reuters Top News')).toBeInTheDocument()
    expect(screen.getByText('https://www.reutersagency.com/feed/')).toBeInTheDocument()
    expect(screen.getByText('Global')).toBeInTheDocument()
    expect(screen.getByText('Politics')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('inactive')).toBeInTheDocument()
    expect(screen.getByText('2026-04-23 10:00')).toBeInTheDocument()
    expect(screen.getByText('从未拉取')).toBeInTheDocument()
  })

  it('添加数据源时校验必填字段并显示错误', async () => {
    const user = userEvent.setup()
    render(<SourcesPage />)
    await screen.findByText('Reuters Top News')

    await user.click(screen.getByRole('button', { name: '添加数据源' }))
    await user.click(screen.getByRole('button', { name: '保存数据源' }))

    expect(screen.getByText('名称不能为空')).toBeInTheDocument()
    expect(screen.getByText('URL 不能为空')).toBeInTheDocument()
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

    render(<SourcesPage />)
    await screen.findByText('Reuters Top News')
    await user.click(screen.getByRole('button', { name: '添加数据源' }))
    await user.type(screen.getByLabelText('名称'), 'BBC World')
    await user.type(screen.getByLabelText('URL'), 'https://feeds.bbci.co.uk/news/world/rss.xml')
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

    render(<SourcesPage />)
    const sourceCard = await screen.findByRole('article', { name: 'Reuters Top News' })

    await user.click(within(sourceCard).getByRole('button', { name: '编辑 Reuters Top News' }))
    const nameInput = screen.getByLabelText('名称')
    await user.clear(nameInput)
    await user.type(nameInput, 'Reuters World')
    await user.click(screen.getByRole('button', { name: '启用数据源' }))
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

    render(<SourcesPage />)
    const sourceCard = await screen.findByRole('article', { name: 'Reuters Top News' })

    await user.click(within(sourceCard).getByRole('button', { name: '删除 Reuters Top News' }))

    await waitFor(() => expect(mockedDeleteSource).toHaveBeenCalledWith(1))
    await waitFor(() => expect(screen.queryByText('Reuters Top News')).not.toBeInTheDocument())
  })

  it('URL 格式非法时显示表单验证错误', async () => {
    const user = userEvent.setup()
    render(<SourcesPage />)
    await screen.findByText('Reuters Top News')

    await user.click(screen.getByRole('button', { name: '添加数据源' }))
    await user.type(screen.getByLabelText('名称'), 'Invalid Feed')
    await user.type(screen.getByLabelText('URL'), 'not-a-url')
    await user.click(screen.getByRole('button', { name: '保存数据源' }))

    expect(screen.getByText('请输入有效的 HTTP/HTTPS URL')).toBeInTheDocument()
    expect(mockedCreateSource).not.toHaveBeenCalled()
  })
})
