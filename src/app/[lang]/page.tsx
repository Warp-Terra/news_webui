"use client";

import { useEffect, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Header } from "@/app/components/layout/Header";
import { useI18n } from "@/app/i18n/I18nProvider";
import { Sidebar } from "@/app/components/layout/Sidebar";
import { NewsDetail } from "@/app/components/news/NewsDetail";
import { NewsList } from "@/app/components/news/NewsList";
import { useNewsStore } from "@/app/store/newsStore";

export default function Home() {
  const { formatMessage, t } = useI18n();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [isTabletSidebarOpen, setIsTabletSidebarOpen] = useState(true);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const hasInitialized = useRef(false);
  const selectedId = useNewsStore((state) => state.selectedId);
  const setSelectedId = useNewsStore((state) => state.setSelectedId);
  const isLoading = useNewsStore((state) => state.isLoading);
  const fetchNews = useNewsStore((state) => state.fetchNews);
  const triggerFetch = useNewsStore((state) => state.triggerFetch);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;
    void fetchNews();
  }, [fetchNews]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = () => setIsMobileViewport(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const isMobileDetailOpen = isMobileViewport && Boolean(selectedId);

  const handleRefreshRss = async () => {
    setRefreshMessage(null);

    const result = await triggerFetch();
    await fetchNews();

    setRefreshMessage(
      result.errors.length > 0
        ? formatMessage(t.dashboard.rssRefreshPartial, {
            fetched: result.fetched,
            errors: result.errors.length,
          })
        : formatMessage(t.dashboard.rssRefreshSuccess, { fetched: result.fetched }),
    );
  };

  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <Header
        isSidebarOpen={isTabletSidebarOpen}
        onOpenFilters={() => setIsMobileFiltersOpen(true)}
        onToggleSidebar={() =>
          setIsTabletSidebarOpen((currentValue) => !currentValue)
        }
      />

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-b bg-background/80 px-4 py-2 md:px-5">
        {refreshMessage && (
          <p className="text-sm text-muted-foreground" role="status">
            {refreshMessage}
          </p>
        )}
        <Button type="button" onClick={handleRefreshRss} disabled={isLoading}>
          {isLoading ? t.dashboard.refreshingRss : t.dashboard.refreshRss}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 bg-muted/25">
        <aside className="hidden w-72 shrink-0 border-r bg-background xl:flex">
          <Sidebar />
        </aside>

        <aside
          className={cn(
            "hidden shrink-0 overflow-hidden border-r bg-background transition-[width] duration-200 md:flex xl:hidden",
            isTabletSidebarOpen ? "w-72" : "w-0 border-r-0",
          )}
        >
          <Sidebar />
        </aside>

        <main className="grid min-w-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] xl:grid-cols-[minmax(0,1fr)_25rem]">
          <div className="min-h-0 min-w-0 md:border-r">
            <NewsList />
          </div>
          <div className="hidden min-h-0 min-w-0 md:block">
            <NewsDetail />
          </div>
        </main>
      </div>

      <Dialog open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
        <DialogContent className="left-0 top-0 h-dvh max-w-[21rem] translate-x-0 translate-y-0 rounded-none border-r p-0 sm:max-w-[22rem] md:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{t.dashboard.mobileFiltersTitle}</DialogTitle>
            <DialogDescription>{t.dashboard.mobileFiltersDescription}</DialogDescription>
          </DialogHeader>
          <Sidebar />
        </DialogContent>
      </Dialog>

      <Dialog
        open={isMobileDetailOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
          }
        }}
      >
        <DialogContent className="left-0 top-0 h-dvh max-w-full translate-x-0 translate-y-0 rounded-none p-0 sm:max-w-full md:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{t.dashboard.newsDetailTitle}</DialogTitle>
            <DialogDescription>{t.dashboard.newsDetailDescription}</DialogDescription>
          </DialogHeader>
          <NewsDetail />
        </DialogContent>
      </Dialog>
    </div>
  );
}
