"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { BarChart3, CircleDot, Database, FileText, Filter, Globe2, Layers3, RotateCcw, Settings } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { useI18n } from "@/app/i18n/I18nProvider";
import { localizedPath } from "@/app/i18n/routing";
import { useNewsStore } from "@/app/store/newsStore";
import type { Category, ImportanceLevel, Region } from "@/app/types/news";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

const regionOptions: Region[] = ["US", "CN", "EU", "JP", "Global"];
const categoryOptions: Category[] = [
  "Economy",
  "Technology",
  "Politics",
  "Military",
  "Energy",
];
const importanceOptions: ImportanceLevel[] = [
  "low",
  "medium",
  "high",
  "critical",
];

export function Sidebar({ className }: SidebarProps) {
  const { locale, t } = useI18n();
  const filters = useNewsStore((state) => state.filters);
  const totalCount = useNewsStore((state) => state.newsList.length);
  const filteredCount = useNewsStore((state) => state.filteredNews().length);
  const updateFilter = useNewsStore((state) => state.updateFilter);
  const clearFilters = useNewsStore((state) => state.clearFilters);

  const hasActiveFilters =
    filters.regions.length > 0 ||
    filters.categories.length > 0 ||
    filters.importanceLevels.length > 0;

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col bg-background text-sm",
        className,
      )}
    >
      <div className="shrink-0 space-y-4 border-b px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Filter className="size-4" />
            </div>
            <div>
              <h2 className="font-semibold leading-none">{t.sidebar.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.sidebar.subtitle}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t.sidebar.clearFilters}
            disabled={!hasActiveFilters}
            onClick={clearFilters}
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>

        <div className="rounded-xl border bg-muted/35 p-3">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {t.sidebar.matchedResults}
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div className="text-2xl font-semibold tabular-nums">
              {filteredCount}
            </div>
            <div className="pb-1 text-xs text-muted-foreground">
              / {totalCount} {t.sidebar.totalSuffix}
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <FilterSection icon={Globe2} title={t.sidebar.regionFilter}>
          {regionOptions.map((region) => (
            <Toggle
              key={region}
              pressed={filters.regions.includes(region)}
              variant="outline"
              size="sm"
              className={cn(
                "justify-start border-border/80 bg-background px-3 text-xs",
                filters.regions.includes(region) &&
                  "border-primary/60 bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/15",
              )}
              onPressedChange={() => updateFilter("regions", region)}
            >
              {t.enums.regions[region as keyof typeof t.enums.regions] ?? region}
            </Toggle>
          ))}
        </FilterSection>

        <Separator className="my-5" />

        <FilterSection icon={Layers3} title={t.sidebar.categoryFilter}>
          {categoryOptions.map((category) => (
            <Toggle
              key={category}
              pressed={filters.categories.includes(category)}
              variant="outline"
              size="sm"
              className={cn(
                "justify-start border-border/80 bg-background px-3 text-xs",
                filters.categories.includes(category) &&
                  "border-primary/60 bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/15",
              )}
              onPressedChange={() => updateFilter("categories", category)}
            >
              {t.enums.categories[category]}
            </Toggle>
          ))}
        </FilterSection>

        <Separator className="my-5" />

        <FilterSection icon={CircleDot} title={t.sidebar.importanceFilter}>
          {importanceOptions.map((importance) => (
            <Toggle
              key={importance}
              pressed={filters.importanceLevels.includes(importance)}
              variant="outline"
              size="sm"
              className={cn(
                "justify-start border-border/80 bg-background px-3 text-xs capitalize",
                filters.importanceLevels.includes(importance) &&
                  "border-primary/60 bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/15",
              )}
              onPressedChange={() =>
                updateFilter("importanceLevels", importance)
              }
            >
              {t.enums.importance[importance]}
            </Toggle>
          ))}
        </FilterSection>
      </div>

      <div className="shrink-0 border-t p-4">
        <Link
          href={localizedPath(locale, "/daily-report")}
          className={cn(buttonVariants({ variant: "outline" }), "mb-2 w-full")}
        >
          <FileText className="size-4" />
          {t.sidebar.dailyReport}
        </Link>
        <Link
          href={localizedPath(locale, "/ai-usage")}
          className={cn(buttonVariants({ variant: "outline" }), "mb-2 w-full")}
        >
          <BarChart3 className="size-4" />
          {t.sidebar.aiUsage}
        </Link>
        <Link
          href={localizedPath(locale, "/ai-settings")}
          className={cn(buttonVariants({ variant: "outline" }), "mb-2 w-full")}
        >
          <Settings className="size-4" />
          {t.sidebar.aiSettings}
        </Link>
        <Link
          href={localizedPath(locale, "/sources")}
          className={cn(buttonVariants({ variant: "outline" }), "mb-2 w-full")}
        >
          <Database className="size-4" />
          {t.sidebar.sources}
        </Link>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={!hasActiveFilters}
          onClick={clearFilters}
        >
          <RotateCcw className="size-4" />
          {t.sidebar.clearFilters}
        </Button>
      </div>
    </aside>
  );
}

interface FilterSectionProps {
  children: ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}

function FilterSection({ children, icon: Icon, title }: FilterSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="size-3.5" />
        {title}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}
