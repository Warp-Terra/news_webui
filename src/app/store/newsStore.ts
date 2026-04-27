import { create } from "zustand";

import {
  batchSummarize as batchSummarizeRequest,
  deleteNewsItem as deleteNewsItemRequest,
  fetchNewsItem as fetchNewsItemRequest,
  fetchNewsList,
  summarizeNewsItem as summarizeNewsItemRequest,
  triggerRssFetch,
  updateNewsStatus as updateNewsStatusRequest,
} from "@/lib/api";
import type { NewsItemWithStatus, NewsStatus } from "@/lib/db";

export interface NewsFilters {
  regions: string[];
  categories: string[];
  importanceLevels: string[];
}

export type FilterKey = keyof NewsFilters;

export interface NewsStore {
  newsList: NewsItemWithStatus[];
  selectedId: string | null;
  filters: NewsFilters;
  searchQuery: string;
  isLoading: boolean;
  isAiLoading: boolean;
  error: string | null;
  aiError: string | null;
  totalCount: number;
  filteredNews: () => NewsItemWithStatus[];
  fetchNews: () => Promise<void>;
  fetchNewsItem: (id: string) => Promise<NewsItemWithStatus | null>;
  updateNewsStatus: (id: string, status: NewsStatus) => Promise<void>;
  deleteNewsItem: (id: string) => Promise<void>;
  triggerFetch: () => Promise<{ fetched: number; errors: string[] }>;
  summarizeNewsItem: (id: string) => Promise<void>;
  batchSummarize: (limit?: number) => Promise<void>;
  setSelectedId: (id: string | null) => void;
  updateFilter: (key: FilterKey, value: string) => void;
  updateSearch: (query: string) => void;
  clearFilters: () => void;
}

const emptyFilters: NewsFilters = {
  regions: [],
  categories: [],
  importanceLevels: [],
};

export const useNewsStore = create<NewsStore>((set, get) => ({
  newsList: [],
  selectedId: null,
  filters: emptyFilters,
  searchQuery: "",
  isLoading: false,
  isAiLoading: false,
  error: null,
  aiError: null,
  totalCount: 0,
  filteredNews: () => {
    const { newsList, filters, searchQuery } = get();
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return newsList.filter((item) => {
      const matchesRegion =
        filters.regions.length === 0 || filters.regions.includes(item.region);
      const matchesCategory =
        filters.categories.length === 0 ||
        filters.categories.includes(item.category);
      const matchesImportance =
        filters.importanceLevels.length === 0 ||
        filters.importanceLevels.includes(item.importance);
      const searchableText = [
        item.title,
        item.summary,
        item.source,
        item.tags.join(" "),
        item.keyPoints.join(" "),
        item.impact ?? "",
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        normalizedQuery.length === 0 || searchableText.includes(normalizedQuery);

      return (
        matchesRegion && matchesCategory && matchesImportance && matchesSearch
      );
    });
  },
  fetchNews: async () => {
    const { filters, searchQuery } = get();

    set({ isLoading: true, error: null });

    try {
      const result = await fetchNewsList(filters, searchQuery);

      set({
        newsList: result.items,
        totalCount: result.count,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
    }
  },
  fetchNewsItem: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const item = await fetchNewsItemRequest(id);

      if (!item) {
        set({ isLoading: false, error: "News not found" });
        return null;
      }

      set((state) => ({
        newsList: upsertNewsItem(state.newsList, item),
        isLoading: false,
        error: null,
      }));

      return item;
    } catch (error) {
      set({ isLoading: false, error: getErrorMessage(error) });
      return null;
    }
  },
  updateNewsStatus: async (id, status) => {
    set({ error: null });

    try {
      await updateNewsStatusRequest(id, status);

      set((state) => ({
        newsList: state.newsList.map((item) =>
          item.id === id ? { ...item, status } : item,
        ),
        error: null,
      }));
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },
  deleteNewsItem: async (id) => {
    set({ error: null });

    try {
      await deleteNewsItemRequest(id);

      set((state) => ({
        newsList: state.newsList.filter((item) => item.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
        totalCount: Math.max(0, state.totalCount - 1),
        error: null,
      }));
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },
  triggerFetch: async () => {
    set({ isLoading: true, error: null });

    try {
      const result = await triggerRssFetch();

      set({ isLoading: false, error: null });

      return result;
    } catch (error) {
      const message = getErrorMessage(error);

      set({ isLoading: false, error: message });

      return { fetched: 0, errors: [message] };
    }
  },
  summarizeNewsItem: async (id) => {
    set({ isAiLoading: true, aiError: null });

    try {
      const result = await summarizeNewsItemRequest(id);

      set((state) => ({
        newsList: state.newsList.map((item) =>
          item.id === id
            ? {
                ...item,
                summary: result.summary,
                keyPoints: result.keyPoints,
                impact: result.impact,
                importance: result.importance,
                tags: result.tags,
              }
            : item,
        ),
        isAiLoading: false,
        aiError: null,
      }));
    } catch (error) {
      set({ isAiLoading: false, aiError: getErrorMessage(error) });
    }
  },
  batchSummarize: async (limit) => {
    set({ isAiLoading: true, aiError: null });

    try {
      await batchSummarizeRequest(limit);
      set({ isAiLoading: false, aiError: null });
    } catch (error) {
      set({ isAiLoading: false, aiError: getErrorMessage(error) });
    }
  },
  setSelectedId: (id) => set({ selectedId: id }),
  updateFilter: (key, value) =>
    set((state) => {
      const currentValues = state.filters[key];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((currentValue) => currentValue !== value)
        : [...currentValues, value];

      return {
        filters: {
          ...state.filters,
          [key]: nextValues,
        },
      };
    }),
  updateSearch: (query) => set({ searchQuery: query }),
  clearFilters: () =>
    set({
      filters: {
        regions: [],
        categories: [],
        importanceLevels: [],
      },
      searchQuery: "",
    }),
}));

function upsertNewsItem(
  newsList: NewsItemWithStatus[],
  item: NewsItemWithStatus,
): NewsItemWithStatus[] {
  const existingIndex = newsList.findIndex((newsItem) => newsItem.id === item.id);

  if (existingIndex === -1) {
    return [item, ...newsList];
  }

  return newsList.map((newsItem) => (newsItem.id === item.id ? item : newsItem));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown API error";
}
