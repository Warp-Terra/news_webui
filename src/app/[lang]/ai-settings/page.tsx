"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Settings, TestTube2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/app/i18n/I18nProvider";
import { localizedPath } from "@/app/i18n/routing";
import { cn } from "@/lib/utils";
import {
  fetchAiSettings,
  saveAiSettings,
  testAiSettings,
  type AiProviderName,
  type AiSettingsPayload,
} from "@/lib/api";
import type { AiModelDefinition, AiProviderDefinition, AiReasoningEffort } from "@/lib/ai/provider-registry";

interface AiSettingsForm {
  provider: AiProviderName;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: string;
  maxTokens: string;
  reasoningEffort: AiReasoningEffort | "";
  enableThinking: "" | "true" | "false";
  requestTimeoutMs: string;
}

const defaultForm: AiSettingsForm = {
  provider: "openai",
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "",
  temperature: "0.7",
  maxTokens: "2048",
  reasoningEffort: "",
  enableThinking: "",
  requestTimeoutMs: "30000",
};

export default function AiSettingsPage() {
  const { formatMessage, locale, t } = useI18n();
  const [form, setForm] = useState<AiSettingsForm>(defaultForm);
  const [providers, setProviders] = useState<readonly AiProviderDefinition[]>([]);
  const [apiKeyMasked, setApiKeyMasked] = useState("");
  const [configured, setConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === form.provider) ?? providers[0],
    [form.provider, providers],
  );

  const selectedModel = useMemo(
    () => getSelectedModel(selectedProvider, form.model),
    [form.model, selectedProvider],
  );

  useEffect(() => {
    let isCurrent = true;

    void fetchAiSettings()
      .then((settings) => {
        if (!isCurrent) return;
        setProviders(settings.providers);
        setConfigured(settings.configured);
        setApiKeyMasked(settings.apiKeyMasked);
        setForm({
          provider: settings.provider,
          apiKey: "",
          baseUrl: settings.baseUrl,
          model: settings.model,
          temperature: String(settings.temperature),
          maxTokens: String(settings.maxTokens),
          reasoningEffort: settings.reasoningEffort,
          enableThinking: settings.enableThinking === null ? "" : (String(settings.enableThinking) as "true" | "false"),
          requestTimeoutMs: String(settings.requestTimeoutMs),
        });
      })
      .catch((loadError) => {
        if (!isCurrent) return;
        setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (!isCurrent) return;
        setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const handleProviderChange = (provider: AiProviderName) => {
    const nextProvider = providers.find((option) => option.id === provider) ?? providers[0];
    if (!nextProvider) return;

    const nextModel = nextProvider.defaultModel || "";
    const modelDefinition = getSelectedModel(nextProvider, nextModel);

    setForm((current) => ({
      ...current,
      provider,
      baseUrl: nextProvider.defaultBaseUrl,
      model: nextModel,
      temperature: String(modelDefinition?.defaultTemperature ?? 0.7),
      maxTokens: String(modelDefinition?.defaultMaxTokens ?? 2048),
      reasoningEffort: "",
      enableThinking: "",
      apiKey: nextProvider.requiresApiKey ? current.apiKey : "",
    }));
  };

  const buildPayload = (): AiSettingsPayload => {
    const payload: AiSettingsPayload = {
      provider: form.provider,
      apiKey: form.apiKey.trim(),
      baseUrl: form.baseUrl.trim(),
      model: form.model.trim(),
      requestTimeoutMs: Number(form.requestTimeoutMs),
    };

    if (selectedModel?.capabilities.temperature) {
      payload.temperature = Number(form.temperature);
    }

    if (selectedModel?.capabilities.maxTokens) {
      payload.maxTokens = Number(form.maxTokens);
    }

    if (selectedModel?.capabilities.reasoningEffort) {
      payload.reasoningEffort = form.reasoningEffort;
    }

    if (selectedModel?.capabilities.enableThinking) {
      payload.enableThinking = form.enableThinking === "" ? null : form.enableThinking === "true";
    }

    return payload;
  };

  const validate = (): string | null => {
    if (!selectedProvider) return t.aiSettings.providerRequired;
    if (!form.model.trim()) return t.aiSettings.modelRequired;
    if (selectedProvider.requiresApiKey && !form.apiKey.trim() && !apiKeyMasked) return t.aiSettings.apiKeyRequired;
    if (selectedModel?.capabilities.temperature && !Number.isFinite(Number(form.temperature))) return t.aiSettings.temperatureInvalid;
    if (selectedModel?.capabilities.maxTokens && (!Number.isInteger(Number(form.maxTokens)) || Number(form.maxTokens) <= 0)) return t.aiSettings.maxTokensInvalid;
    if (selectedModel?.capabilities.reasoningEffort && form.reasoningEffort && !["low", "medium", "high"].includes(form.reasoningEffort)) return t.aiSettings.reasoningEffortInvalid;
    if (!Number.isInteger(Number(form.requestTimeoutMs)) || Number(form.requestTimeoutMs) <= 0) return t.aiSettings.timeoutInvalid;
    return null;
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveAiSettings(buildPayload());
      setProviders(saved.providers);
      setConfigured(saved.configured);
      setApiKeyMasked(saved.apiKeyMasked);
      setForm((current) => ({ ...current, apiKey: "" }));
      setMessage(t.aiSettings.saved);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setError(null);
    setMessage(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsTesting(true);
    try {
      const result = await testAiSettings(buildPayload());
      setMessage(formatMessage(t.aiSettings.testSuccess, { model: result.model }));
    } catch (testError) {
      setError(getErrorMessage(testError));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-muted/25 text-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-2xl border bg-background p-4 shadow-sm md:flex-row md:items-center md:justify-between md:p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Settings className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{t.aiSettings.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t.aiSettings.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant={configured ? "secondary" : "outline"}>{configured ? t.common.configured : t.common.notConfigured}</Badge>
                {apiKeyMasked && <Badge variant="outline">Key: {apiKeyMasked}</Badge>}
              </div>
            </div>
          </div>
          <Link href={localizedPath(locale, "/")} className={cn(buttonVariants({ variant: "outline" }))}>
            <ArrowLeft className="size-4" />
            {t.common.backToDashboard}
          </Link>
        </header>

        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
        {message && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</div>}

        <Card>
          <CardHeader>
            <CardTitle>{t.aiSettings.connectionConfig}</CardTitle>
            <CardDescription>{t.aiSettings.connectionDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">{t.aiSettings.loadingSettings}</div>
            ) : (
              <form className="grid gap-5" onSubmit={handleSave}>
                <FormField label={t.aiSettings.provider} htmlFor="provider">
                  <select
                    id="provider"
                    aria-label={t.aiSettings.provider}
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={form.provider}
                    onChange={(event) => handleProviderChange(event.target.value as AiProviderName)}
                  >
                    {providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>{provider.label}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label={t.aiSettings.apiKey} htmlFor="api-key" description={selectedProvider?.requiresApiKey ? "不会回显完整密钥；留空保存时会保留已有密钥。" : "本地模型通常不需要 API Key。"}>
                  <Input
                    id="api-key"
                    aria-label={t.aiSettings.apiKey}
                    type="password"
                    autoComplete="off"
                    placeholder={apiKeyMasked || (selectedProvider?.requiresApiKey ? "sk-..." : "可留空")}
                    value={form.apiKey}
                    onChange={(event) => setForm((current) => ({ ...current, apiKey: event.target.value }))}
                  />
                </FormField>

                <FormField label={t.aiSettings.baseUrl} htmlFor="base-url">
                  <Input id="base-url" value={form.baseUrl} onChange={(event) => setForm((current) => ({ ...current, baseUrl: event.target.value }))} />
                </FormField>

                <FormField label={t.aiSettings.model} htmlFor="model">
                  <Input
                    id="model"
                    aria-label={t.aiSettings.model}
                    list="ai-model-options"
                    value={form.model}
                    placeholder={selectedProvider?.defaultModel || "输入模型名称"}
                    onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
                  />
                  <datalist id="ai-model-options">
                    {selectedProvider?.models.map((model) => (
                      <option key={model.id} value={model.id}>{model.label}</option>
                    ))}
                  </datalist>
                </FormField>

                <div className="grid gap-4 md:grid-cols-2">
                  {selectedModel?.capabilities.temperature && (
                    <FormField label={t.aiSettings.temperature} htmlFor="temperature">
                      <Input id="temperature" aria-label={t.aiSettings.temperature} inputMode="decimal" value={form.temperature} onChange={(event) => setForm((current) => ({ ...current, temperature: event.target.value }))} />
                    </FormField>
                  )}
                  {selectedModel?.capabilities.maxTokens && (
                    <FormField label={t.aiSettings.maxTokens} htmlFor="max-tokens">
                      <Input id="max-tokens" aria-label={t.aiSettings.maxTokens} inputMode="numeric" value={form.maxTokens} onChange={(event) => setForm((current) => ({ ...current, maxTokens: event.target.value }))} />
                    </FormField>
                  )}
                  {selectedModel?.capabilities.reasoningEffort && (
                    <FormField label={t.aiSettings.reasoningEffort} htmlFor="reasoning-effort">
                      <select id="reasoning-effort" aria-label={t.aiSettings.reasoningEffort} className="h-10 rounded-md border bg-background px-3 text-sm" value={form.reasoningEffort} onChange={(event) => setForm((current) => ({ ...current, reasoningEffort: event.target.value as AiReasoningEffort | "" }))}>
                        <option value="">Default</option>
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                      </select>
                    </FormField>
                  )}
                  {selectedModel?.capabilities.enableThinking && (
                    <FormField label={t.aiSettings.enableThinking} htmlFor="enable-thinking">
                      <select id="enable-thinking" aria-label={t.aiSettings.enableThinking} className="h-10 rounded-md border bg-background px-3 text-sm" value={form.enableThinking} onChange={(event) => setForm((current) => ({ ...current, enableThinking: event.target.value as "" | "true" | "false" }))}>
                        <option value="">Default</option>
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    </FormField>
                  )}
                </div>
                <FormField label={t.aiSettings.requestTimeoutMs} htmlFor="request-timeout" description="生成日报等大任务建议设为 120000 (2 分钟)">
                  <Input id="request-timeout" aria-label={t.aiSettings.requestTimeoutMs} inputMode="numeric" value={form.requestTimeoutMs} onChange={(event) => setForm((current) => ({ ...current, requestTimeoutMs: event.target.value }))} />
                </FormField>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    {t.aiSettings.saveSettings}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleTest} disabled={isTesting}>
                    {isTesting ? <Loader2 className="size-4 animate-spin" /> : <TestTube2 className="size-4" />}
                    {t.aiSettings.testConnection}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function getSelectedModel(
  provider: AiProviderDefinition | undefined,
  model: string,
): AiModelDefinition | undefined {
  if (!provider) {
    return undefined;
  }

  return (
    provider.models.find((definition) => definition.id === model.trim()) ??
    provider.models.find((definition) => definition.id === provider.defaultModel) ??
    provider.models[0]
  );
}

interface FormFieldProps {
  children: React.ReactNode;
  description?: string;
  htmlFor: string;
  label: string;
}

function FormField({ children, description, htmlFor, label }: FormFieldProps) {
  return (
    <label className="grid gap-2 text-sm font-medium" htmlFor={htmlFor}>
      <span>{label}</span>
      {children}
      {description && <span className="text-xs font-normal text-muted-foreground">{description}</span>}
    </label>
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.length > 0 ? error.message : "请求失败";
}
