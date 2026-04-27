"use client";

import {
  Globe2,
  Menu,
  Moon,
  Search,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNewsStore } from "@/app/store/newsStore";
import { cn } from "@/lib/utils";

interface HeaderProps {
  isSidebarOpen?: boolean;
  onOpenFilters?: () => void;
  onToggleSidebar?: () => void;
}

export function Header({
  isSidebarOpen = false,
  onOpenFilters,
  onToggleSidebar,
}: HeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const searchQuery = useNewsStore((state) => state.searchQuery);
  const updateSearch = useNewsStore((state) => state.updateSearch);
  const isDark = resolvedTheme === "dark";

  return (
    <header className="flex h-auto shrink-0 flex-col gap-3 border-b bg-background/95 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80 md:h-16 md:flex-row md:items-center md:gap-4 md:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="md:hidden"
          aria-label="打开移动端筛选面板"
          onClick={onOpenFilters}
        >
          <SlidersHorizontal className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="hidden md:inline-flex xl:hidden"
          aria-label={isSidebarOpen ? "收起筛选栏" : "展开筛选栏"}
          aria-pressed={isSidebarOpen}
          onClick={onToggleSidebar}
        >
          <Menu className="size-4" />
        </Button>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-primary text-primary-foreground shadow-sm">
            <Globe2 className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground md:text-lg">
              Global News Intelligence Dashboard
            </h1>
            <p className="hidden text-xs text-muted-foreground lg:block">
              Multi-region monitoring · Source intelligence · Impact briefing
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2 md:justify-end">
        <div className="relative w-full md:max-w-md lg:max-w-xl">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="搜索标题、摘要或来源..."
            aria-label="搜索新闻"
            className="h-9 bg-background pl-8 pr-3"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label="切换深色或浅色模式"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="shrink-0"
        >
          <span className="relative flex size-4 items-center justify-center">
            <Sun
              className={cn(
                "absolute size-4 transition-all dark:scale-0 dark:rotate-90 dark:opacity-0",
                "scale-100 rotate-0 opacity-100",
              )}
            />
            <Moon
              className={cn(
                "absolute size-4 scale-0 -rotate-90 opacity-0 transition-all dark:scale-100 dark:rotate-0 dark:opacity-100",
              )}
            />
          </span>
        </Button>
      </div>
    </header>
  );
}
