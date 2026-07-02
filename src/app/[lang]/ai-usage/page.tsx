"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, BarChart3, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyUsd } from "@/app/i18n/format";
import { useI18n } from "@/app/i18n/I18nProvider";
import { localizedPath } from "@/app/i18n/routing";
import { fetchAiUsage, type AiUsageItem, type AiUsageResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

const emptyUsage: AiUsageResponse = {
  items: [],
  totalTokens: 0,
  totalCost: 0,
};

export default function AiUsagePage() {
  const { locale, t } = useI18n();
  const [dateRange, setDateRange] = useState(() => getDefaultDateRange());
  const [usage, setUsage] = useState<AiUsageResponse>(emptyUsage);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedInitialUsage = useRef(false);

  const loadUsage = useCallback(async (startDate: string, endDate: string) => {
    setIsLoading(true);
    setError(null);

    try {
      setUsage(await fetchAiUsage(startDate, endDate));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
      setUsage(emptyUsage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasLoadedInitialUsage.current) {
      return;
    }

    let isCurrent = true;
    hasLoadedInitialUsage.current = true;

    void fetchAiUsage(dateRange.startDate, dateRange.endDate)
      .then((nextUsage) => {
        if (!isCurrent) {
          return;
        }

        setUsage(nextUsage);
        setError(null);
      })
      .catch((loadError) => {
        if (!isCurrent) {
          return;
        }

        setError(getErrorMessage(loadError));
        setUsage(emptyUsage);
      })
      .finally(() => {
        if (!isCurrent) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [dateRange.endDate, dateRange.startDate]);

  const handleDateRangeChange = (partial: Partial<typeof dateRange>) => {
    const nextDateRange = { ...dateRange, ...partial };

    setDateRange(nextDateRange);
    void loadUsage(nextDateRange.startDate, nextDateRange.endDate);
  };

  return (
    <main className="min-h-dvh bg-muted/25 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-2xl border bg-background p-4 shadow-sm md:flex-row md:items-center md:justify-between md:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{t.aiUsage.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.aiUsage.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{t.aiUsage.defaultRange}</Badge>
                <Badge variant="outline">{t.aiUsage.usdCost}</Badge>
              </div>
            </div>
          </div>
          <Link href={localizedPath(locale, "/")} className={cn(buttonVariants({ variant: "outline" }))}>
            <ArrowLeft className="size-4" />
            {t.common.backToDashboard}
          </Link>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.aiUsage.dateRange}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row">
              <DateField
                id="ai-usage-start-date"
                label={t.aiUsage.startDate}
                value={dateRange.startDate}
                onChange={(startDate) => handleDateRangeChange({ startDate })}
              />
              <DateField
                id="ai-usage-end-date"
                label={t.aiUsage.endDate}
                value={dateRange.endDate}
                onChange={(endDate) => handleDateRangeChange({ endDate })}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadUsage(dateRange.startDate, dateRange.endDate)}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <BarChart3 className="size-4" />}
              {t.aiUsage.refreshUsage}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <UsageStat title={t.aiUsage.totalTokens} value={String(usage.totalTokens)} />
          <UsageStat title={t.aiUsage.totalCost} value={formatCurrencyUsd(usage.totalCost, locale)} />
          <UsageStat title={t.aiUsage.callCount} value={String(usage.items.length)} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {t.aiUsage.records}
              {isLoading && (
                <span className="inline-flex items-center gap-2 text-sm font-normal text-muted-foreground" role="status">
                  <Loader2 className="size-4 animate-spin" />
                  {t.common.loading}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usage.items.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[44rem] text-left text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t.aiUsage.date}</th>
                      <th className="px-4 py-3 font-medium">{t.aiUsage.model}</th>
                      <th className="px-4 py-3 font-medium">{t.aiUsage.operation}</th>
                      <th className="px-4 py-3 font-medium">{t.aiUsage.tokens}</th>
                      <th className="px-4 py-3 font-medium">{t.aiUsage.cost}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {usage.items.map((item, index) => (
                      <UsageRow key={item.id ?? `${item.date}-${item.operation}-${index}`} item={item} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
                {t.aiUsage.empty}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function DateField({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      />
    </div>
  );
}

function UsageStat({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function UsageRow({ item }: { item: AiUsageItem }) {
  const { locale } = useI18n();
  const tokens = item.tokensIn + item.tokensOut;

  return (
    <tr>
      <td className="px-4 py-3">{item.date}</td>
      <td className="px-4 py-3">{item.model}</td>
      <td className="px-4 py-3">{item.operation}</td>
      <td className="px-4 py-3 tabular-nums">{tokens}</td>
      <td className="px-4 py-3 tabular-nums">{formatCurrencyUsd(item.costUsd, locale)}</td>
    </tr>
  );
}

function getDefaultDateRange(): { startDate: string; endDate: string } {
  const endDate = getLocalIsoDate(new Date());
  const start = new Date(`${endDate}T00:00:00.000`);
  start.setDate(start.getDate() - 6);

  return {
    startDate: getLocalIsoDate(start),
    endDate,
  };
}

function getLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "加载 AI 用量失败";
}
