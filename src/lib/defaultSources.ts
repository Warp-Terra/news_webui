import type { Category, Region } from '@/app/types/news'

export interface DefaultRssSource {
  name: string
  url: string
  region: Region
  category: Category
  active: boolean
  lastFetchedAt: null
}

export const DEFAULT_RSS_SOURCES: DefaultRssSource[] = [
  {
    name: 'BBC World',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    region: 'Global',
    category: 'Politics',
    active: true,
    lastFetchedAt: null,
  },
  {
    name: 'BBC Business',
    url: 'https://feeds.bbci.co.uk/news/business/rss.xml',
    region: 'Global',
    category: 'Economy',
    active: true,
    lastFetchedAt: null,
  },
  {
    name: 'BBC Technology',
    url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    region: 'Global',
    category: 'Technology',
    active: true,
    lastFetchedAt: null,
  },
  {
    name: 'NPR World',
    url: 'https://feeds.npr.org/1004/rss.xml',
    region: 'US',
    category: 'Politics',
    active: true,
    lastFetchedAt: null,
  },
  {
    name: 'The Guardian World',
    url: 'https://www.theguardian.com/world/rss',
    region: 'Global',
    category: 'Politics',
    active: true,
    lastFetchedAt: null,
  },
  {
    name: 'The Guardian Technology',
    url: 'https://www.theguardian.com/technology/rss',
    region: 'Global',
    category: 'Technology',
    active: true,
    lastFetchedAt: null,
  },
]
