"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, FileText, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { generateDailyReport, type DailyReportResult } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function DailyReportPage() {
  const [date, setDate] = useState(() => getLocalIsoDate(new Date()));
  const [report, setReport] = useState<DailyReportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      setReport(await generateDailyReport(date));
    } catch (generateError) {
      setError(getErrorMessage(generateError));
    } finally {
      setIsLoading(false);
    }
  };

  const totalTokens = report ? report.tokensIn + report.tokensOut : 0;

  return (
    <main className="min-h-dvh bg-muted/25 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-2xl border bg-background p-4 shadow-sm md:flex-row md:items-center md:justify-between md:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <FileText className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">AI 日报</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                选择日期后生成当日 Global News Intelligence Markdown 日报。
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">Markdown 输出</Badge>
                <Badge variant="outline">Token 统计</Badge>
              </div>
            </div>
          </div>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
            <ArrowLeft className="size-4" />
            返回 Dashboard
          </Link>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" />
              生成日报
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <label htmlFor="daily-report-date" className="text-sm font-medium">
                日报日期
              </label>
              <input
                id="daily-report-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
            </div>
            <Button type="button" onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {isLoading ? "生成中..." : "生成日报"}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card className="min-h-72">
          <CardHeader>
            <CardTitle className="text-base">日报内容</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <Loader2 className="size-4 animate-spin" />
                正在生成日报...
              </div>
            ) : report ? (
              <pre className="whitespace-pre-wrap rounded-xl border bg-muted/30 p-4 text-sm leading-7">
                {report.markdown}
              </pre>
            ) : (
              <p className="rounded-xl border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
                生成后将在这里显示 Markdown 日报内容。
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">生成统计</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm md:grid-cols-4">
              <Stat label="新闻数量" value={report ? `${report.newsCount} 条` : "--"} />
              <Stat label="输入 Token" value={report ? String(report.tokensIn) : "--"} />
              <Stat label="输出 Token" value={report ? String(report.tokensOut) : "--"} />
              <Stat label="总 Token" value={report ? String(totalTokens) : "--"} />
            </dl>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <Separator className="my-3" />
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function getLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "生成日报失败";
}
