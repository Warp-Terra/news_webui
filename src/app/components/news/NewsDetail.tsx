"use client";

import {
  AlertTriangle,
  CalendarClock,
  ExternalLink,
  Info,
  ListChecks,
  Loader2,
  RadioTower,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNewsStore } from "@/app/store/newsStore";
import type { ImportanceLevel } from "@/app/types/news";
import { cn } from "@/lib/utils";

interface NewsDetailProps {
  className?: string;
}

const importanceStyles: Record<ImportanceLevel, string> = {
  low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  medium: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  high: "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  critical: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
};

export function NewsDetail({ className }: NewsDetailProps) {
  const selectedId = useNewsStore((state) => state.selectedId);
  const newsList = useNewsStore((state) => state.newsList);
  const summarizeNewsItem = useNewsStore((state) => state.summarizeNewsItem);
  const isAiLoading = useNewsStore((state) => state.isAiLoading);
  const aiError = useNewsStore((state) => state.aiError);
  const item = newsList.find((newsItem) => newsItem.id === selectedId);

  if (!item) {
    return (
      <section
        className={cn(
          "flex h-full min-h-0 flex-col items-center justify-center bg-background px-8 text-center",
          className,
        )}
      >
        <div className="flex size-16 items-center justify-center rounded-3xl border bg-muted/40 text-muted-foreground shadow-sm">
          <Info className="size-7" />
        </div>
        <h2 className="mt-5 text-lg font-semibold">请选择一条新闻查看详情</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          从中间情报列表中选择任意新闻，右侧将展示完整摘要、关键点和影响判断。
        </p>
      </section>
    );
  }

  const hasAiSummary = item.keyPoints.length > 0 && item.impact !== undefined;

  return (
    <section className={cn("flex h-full min-h-0 flex-col bg-background", className)}>
      <div className="shrink-0 border-b px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{item.region}</Badge>
          <Badge variant="outline">{item.category}</Badge>
          <Badge
            variant="outline"
            className={cn("capitalize", importanceStyles[item.importance])}
          >
            {item.importance}
          </Badge>
        </div>
        <h2 className="mt-4 text-xl font-semibold leading-8 tracking-tight md:text-2xl">
          {item.title}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-3.5" />
            {formatDate(item.publishedAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <RadioTower className="size-3.5" />
            {item.source}
          </span>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4 md:p-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.16em] text-muted-foreground">
                <Info className="size-4" />
                完整摘要
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-card-foreground">
                {item.summary}
              </p>
            </CardContent>
          </Card>

          {hasAiSummary ? (
            <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.16em] text-primary">
                  <Sparkles className="size-4" />
                  AI 摘要
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <ListChecks className="size-4" />
                    关键点
                  </div>
                  <ul className="space-y-3 text-sm leading-6">
                    {item.keyPoints.map((point) => (
                      <li key={point} className="flex gap-3">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="size-4" />
                    影响判断
                  </div>
                  <p className="text-sm leading-7">{item.impact}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.16em] text-primary">
                  <Sparkles className="size-4" />
                  AI 摘要
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-6 text-muted-foreground">
                  当前新闻还没有 AI 生成的关键点和影响判断，可按需生成摘要。
                </p>
                {aiError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {aiError}
                  </div>
                )}
                <Button
                  type="button"
                  onClick={() => void summarizeNewsItem(item.id)}
                  disabled={isAiLoading}
                >
                  {isAiLoading ? (
                    <span role="status" aria-label="正在生成 AI 摘要">
                      <Loader2 className="size-4 animate-spin" />
                    </span>
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {isAiLoading ? "生成中..." : "生成 AI 摘要"}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.16em] text-muted-foreground">
                <RadioTower className="size-4" />
                来源信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">来源</span>
                <span className="font-medium">{item.source}</span>
              </div>
              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  打开来源链接
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
