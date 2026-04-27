"use client";

import { CalendarClock, RadioTower } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNewsStore } from "@/app/store/newsStore";
import type { ImportanceLevel, NewsItem } from "@/app/types/news";
import { cn } from "@/lib/utils";

interface NewsCardProps {
  item: NewsItem;
  onSelect?: (id: string) => void;
}

const importanceStyles: Record<ImportanceLevel, string> = {
  low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  medium: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  high: "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  critical: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
};

export function NewsCard({ item, onSelect }: NewsCardProps) {
  const selectedId = useNewsStore((state) => state.selectedId);
  const setSelectedId = useNewsStore((state) => state.setSelectedId);
  const isSelected = selectedId === item.id;

  const selectItem = () => {
    setSelectedId(item.id);
    onSelect?.(item.id);
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      size="sm"
      aria-pressed={isSelected}
      onClick={selectItem}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectItem();
        }
      }}
      className={cn(
        "cursor-pointer border border-transparent bg-card/95 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
        isSelected &&
          "border-primary/60 bg-primary/5 shadow-md ring-2 ring-primary/20 dark:bg-primary/10",
      )}
    >
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="line-clamp-2 text-[0.95rem] leading-snug">
            {item.title}
          </CardTitle>
          <Badge
            variant="outline"
            className={cn("capitalize", importanceStyles[item.importance])}
          >
            {item.importance}
          </Badge>
        </div>
        <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1">
            <RadioTower className="size-3.5" />
            {item.source}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="size-3.5" />
            {formatDate(item.publishedAt)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
          {item.summary}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{item.region}</Badge>
          <Badge variant="outline">{item.category}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
