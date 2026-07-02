"use client";

import { Newspaper, SearchX } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/app/i18n/I18nProvider";
import { useNewsStore } from "@/app/store/newsStore";
import { NewsCard } from "./NewsCard";

export function NewsList() {
  const { formatMessage, t } = useI18n();
  const newsList = useNewsStore((state) => state.newsList);
  const searchQuery = useNewsStore((state) => state.searchQuery);
  // Subscribe to filter changes so the derived list recalculates after Sidebar updates.
  useNewsStore((state) => state.filters);
  const getFilteredNews = useNewsStore((state) => state.filteredNews);
  const filteredNews = getFilteredNews();
  const totalCount = newsList.length;

  return (
    <section className="flex h-full min-h-0 flex-col bg-muted/20">
      <div className="shrink-0 border-b bg-background/90 px-4 py-3 backdrop-blur md:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Newspaper className="size-4 text-muted-foreground" />
              {t.newsList.title}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatMessage(t.newsList.count, {
                filtered: filteredNews.length,
                total: totalCount,
              })}
            </p>
          </div>
          {searchQuery.trim().length > 0 && (
            <div className="hidden rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground sm:block">
              {formatMessage(t.newsList.searchBadge, {
                query: searchQuery.trim(),
              })}
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {filteredNews.length > 0 ? (
          <div className="space-y-3 p-4 md:p-5">
            {filteredNews.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[55vh] flex-col items-center justify-center px-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl border bg-background text-muted-foreground shadow-sm">
              <SearchX className="size-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold">
              {t.newsList.emptyTitle}
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {t.newsList.emptyDescription}
            </p>
          </div>
        )}
      </ScrollArea>
    </section>
  );
}
