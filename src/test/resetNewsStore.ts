import { mockNews } from '@/app/data/mockNews'
import { useNewsStore } from '@/app/store/newsStore'
import type { NewsItemWithStatus } from '@/lib/db'

type NewsStoreState = ReturnType<typeof useNewsStore.getState>

const initialState = useNewsStore.getState()
const mockNewsWithStatus: NewsItemWithStatus[] = mockNews.map((item) => ({
  ...item,
  status: 'unread',
}))

export function resetNewsStore(overrides: Partial<NewsStoreState> = {}) {
  const newsList = overrides.newsList ?? mockNewsWithStatus
  const state: NewsStoreState = {
    ...initialState,
    newsList,
    selectedId: null,
    filters: {
      regions: [],
      categories: [],
      importanceLevels: [],
    },
    searchQuery: '',
    isLoading: false,
    error: null,
    totalCount: overrides.totalCount ?? newsList.length,
    ...overrides,
  }

  useNewsStore.setState(state, true)
}
