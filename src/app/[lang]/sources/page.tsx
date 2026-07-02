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
import { formatFullDateTime } from "@/app/i18n/format";
import { useI18n } from "@/app/i18n/I18nProvider";
import { localizedPath } from "@/app/i18n/routing";
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
  const { formatMessage, locale, t } = useI18n();
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
    const errors = validateSourceForm(form, t);

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
                {t.sources.title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.sources.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{formatMessage(t.sources.totalSources, { count: sources.length })}</Badge>
                <Badge variant="outline">{formatMessage(t.sources.activeSources, { count: activeCount })}</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={localizedPath(locale, "/")} className={cn(buttonVariants({ variant: "outline" }))}>
              <ArrowLeft className="size-4" />
              {t.common.backToDashboard}
            </Link>
            <Button type="button" onClick={openCreateDialog}>
              <Plus className="size-4" />
              {t.sources.addSource}
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
                {t.sources.loadingSources}
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
                <p className="text-sm text-muted-foreground">
                  {t.sources.emptySources}
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSource ? t.sources.editSource : t.sources.createSource}</DialogTitle>
            <DialogDescription>
              {t.sources.dialogDescription}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Field id="source-name" label={t.sources.name} error={formErrors.name}>
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

            <Field id="source-url" label={t.sources.url} error={formErrors.url}>
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
              <Field id="source-region" label={t.sources.region} error={formErrors.region}>
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
                      {t.enums.regions[region as keyof typeof t.enums.regions] ?? region}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="source-category" label={t.sources.category} error={formErrors.category}>
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
                      {t.enums.categories[category]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3">
              <div>
                <div className="text-sm font-medium">{t.sources.active}</div>
                <p className="text-xs text-muted-foreground">
                  关闭后该源不会参与 RSS 抓取。
                </p>
              </div>
              <Toggle
                type="button"
                variant="outline"
                pressed={form.active}
                aria-label={t.sources.active}
                onPressedChange={(active) =>
                  setForm((currentForm) => ({ ...currentForm, active }))
                }
              >
                {form.active ? t.sources.active : t.sources.inactive}
              </Toggle>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSaving}
              >
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? t.sources.savingSource : t.sources.saveSource}
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
  const { locale, t } = useI18n();

  return (
    <Card role="article" aria-label={source.name}>
      <CardHeader className="gap-3 md:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{source.name}</CardTitle>
            <Badge variant={source.active ? "secondary" : "outline"}>
              {source.active ? t.sources.active : t.sources.inactive}
            </Badge>
          </div>
          <CardDescription className="mt-1 break-all">{source.url}</CardDescription>
        </div>
        <CardAction className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`${t.common.edit} ${source.name}`}
            onClick={() => onEdit(source)}
          >
            <Pencil className="size-3.5" />
            {t.common.edit}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            aria-label={`${t.common.delete} ${source.name}`}
            onClick={() => onDelete(source)}
          >
            <Trash2 className="size-3.5" />
            {t.common.delete}
          </Button>
        </CardAction>
      </CardHeader>
      <Separator />
      <CardContent>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <SourceMeta label={t.sources.region} value={t.enums.regions[source.region as keyof typeof t.enums.regions] ?? source.region} />
          <SourceMeta label={t.sources.category} value={t.enums.categories[source.category]} />
          <SourceMeta label={t.sources.lastFetchedAt} value={source.lastFetchedAt ? formatFullDateTime(source.lastFetchedAt, locale) : t.sources.neverFetched} />
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
  id,
  label,
}: {
  children: ReactNode;
  error?: string;
  id: string;
  label: string;
}) {
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

function validateSourceForm(form: SourceFormState, t: ReturnType<typeof useI18n>["t"]): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) {
    errors.name = t.sources.nameRequired;
  }

  if (!form.url.trim()) {
    errors.url = t.sources.urlRequired;
  } else {
    try {
      new URL(form.url);
    } catch {
      errors.url = t.sources.urlInvalid;
    }
  }

  return errors;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "未知错误";
}
