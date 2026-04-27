"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowLeft, Database, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import type { Category, Region } from "@/app/types/news";
import {
  createSource,
  deleteSource,
  fetchSourcesList,
  updateSource,
  type NewsSource,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const regionOptions: Region[] = ["US", "CN", "EU", "JP", "Global"];
const categoryOptions: Category[] = [
  "Economy",
  "Technology",
  "Politics",
  "Military",
  "Energy",
];

interface SourceFormState {
  name: string;
  url: string;
  region: Region;
  category: Category;
  active: boolean;
}

type FormErrors = Partial<Record<keyof SourceFormState, string>>;

const emptyForm: SourceFormState = {
  name: "",
  url: "",
  region: "Global",
  category: "Economy",
  active: true,
};

export default function SourcesPage() {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<NewsSource | null>(null);
  const [form, setForm] = useState<SourceFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const loadSources = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setSources(await fetchSourcesList());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    void fetchSourcesList()
      .then((nextSources) => {
        if (!isCurrent) {
          return;
        }

        setSources(nextSources);
        setError(null);
      })
      .catch((loadError) => {
        if (!isCurrent) {
          return;
        }

        setError(getErrorMessage(loadError));
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
  }, []);

  const activeCount = useMemo(
    () => sources.filter((source) => source.active).length,
    [sources],
  );

  const openCreateDialog = () => {
    setEditingSource(null);
    setForm(emptyForm);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (source: NewsSource) => {
    setEditingSource(source);
    setForm({
      name: source.name,
      url: source.url,
      region: source.region,
      category: source.category,
      active: source.active,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateSourceForm(form);

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const payload = {
      name: form.name.trim(),
      url: form.url.trim(),
      region: form.region,
      category: form.category,
      active: form.active,
      lastFetchedAt: editingSource?.lastFetchedAt ?? null,
    } satisfies Omit<NewsSource, "id">;

    setIsSaving(true);
    setError(null);

    try {
      if (editingSource) {
        await updateSource(editingSource.id, payload);
      } else {
        await createSource(payload);
      }

      setDialogOpen(false);
      await loadSources();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (source: NewsSource) => {
    setError(null);

    try {
      await deleteSource(source.id);
      await loadSources();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  };

  return (
    <main className="min-h-dvh bg-muted/25 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-2xl border bg-background p-4 shadow-sm md:flex-row md:items-center md:justify-between md:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Database className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                数据源管理
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                管理 RSS 数据源，维护地区、分类和启用状态。
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">总计 {sources.length} 个源</Badge>
                <Badge variant="outline">启用 {activeCount} 个源</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
              <ArrowLeft className="size-4" />
              返回 Dashboard
            </Link>
            <Button type="button" onClick={openCreateDialog}>
              <Plus className="size-4" />
              添加数据源
            </Button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <section className="grid gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                正在加载数据源...
              </CardContent>
            </Card>
          ) : sources.length > 0 ? (
            sources.map((source) => (
              <SourceCard
                key={source.id}
                source={source}
                onEdit={openEditDialog}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <h2 className="text-base font-semibold">暂无数据源</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  点击“添加数据源”创建第一个 RSS 源。
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSource ? "编辑数据源" : "添加数据源"}</DialogTitle>
            <DialogDescription>
              填写 RSS 源名称、URL、地区和分类。保存后会自动刷新列表。
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Field label="名称" error={formErrors.name}>
              <Input
                id="source-name"
                value={form.name}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    name: event.target.value,
                  }))
                }
                aria-invalid={Boolean(formErrors.name)}
                aria-describedby={formErrors.name ? "source-name-error" : undefined}
              />
            </Field>

            <Field label="URL" error={formErrors.url}>
              <Input
                id="source-url"
                value={form.url}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    url: event.target.value,
                  }))
                }
                aria-invalid={Boolean(formErrors.url)}
                aria-describedby={formErrors.url ? "source-url-error" : undefined}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="地区" error={formErrors.region}>
                <select
                  id="source-region"
                  className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  value={form.region}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      region: event.target.value as Region,
                    }))
                  }
                >
                  {regionOptions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="分类" error={formErrors.category}>
                <select
                  id="source-category"
                  className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                  value={form.category}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      category: event.target.value as Category,
                    }))
                  }
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3">
              <div>
                <div className="text-sm font-medium">启用状态</div>
                <p className="text-xs text-muted-foreground">
                  关闭后该源不会参与 RSS 抓取。
                </p>
              </div>
              <Toggle
                type="button"
                variant="outline"
                pressed={form.active}
                aria-label="启用数据源"
                onPressedChange={(active) =>
                  setForm((currentForm) => ({ ...currentForm, active }))
                }
              >
                {form.active ? "active" : "inactive"}
              </Toggle>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSaving}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "保存中..." : "保存数据源"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

interface SourceCardProps {
  source: NewsSource;
  onEdit: (source: NewsSource) => void;
  onDelete: (source: NewsSource) => void;
}

function SourceCard({ source, onEdit, onDelete }: SourceCardProps) {
  return (
    <Card role="article" aria-label={source.name}>
      <CardHeader className="gap-3 md:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{source.name}</CardTitle>
            <Badge variant={source.active ? "secondary" : "outline"}>
              {source.active ? "active" : "inactive"}
            </Badge>
          </div>
          <CardDescription className="mt-1 break-all">{source.url}</CardDescription>
        </div>
        <CardAction className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`编辑 ${source.name}`}
            onClick={() => onEdit(source)}
          >
            <Pencil className="size-3.5" />
            编辑
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            aria-label={`删除 ${source.name}`}
            onClick={() => onDelete(source)}
          >
            <Trash2 className="size-3.5" />
            删除
          </Button>
        </CardAction>
      </CardHeader>
      <Separator />
      <CardContent>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <SourceMeta label="地区" value={source.region} />
          <SourceMeta label="分类" value={source.category} />
          <SourceMeta label="状态" value={source.active ? "已启用" : "已停用"} />
          <SourceMeta label="最后拉取时间" value={formatDateTime(source.lastFetchedAt)} />
        </dl>
      </CardContent>
    </Card>
  );
}

function SourceMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/35 p-3">
      <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function Field({
  children,
  error,
  label,
}: {
  children: ReactNode;
  error?: string;
  label: "名称" | "URL" | "地区" | "分类";
}) {
  const id = label === "名称" ? "source-name" : label === "URL" ? "source-url" : label === "地区" ? "source-region" : "source-category";
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      {children}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function validateSourceForm(form: SourceFormState): FormErrors {
  const errors: FormErrors = {};

  if (form.name.trim().length === 0) {
    errors.name = "名称不能为空";
  }

  if (form.url.trim().length === 0) {
    errors.url = "URL 不能为空";
  } else if (!isHttpUrl(form.url.trim())) {
    errors.url = "请输入有效的 HTTP/HTTPS URL";
  }

  return errors;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "从未拉取";
  }

  return value.slice(0, 16).replace("T", " ");
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "未知错误";
}
