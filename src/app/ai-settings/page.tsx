"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Settings, TestTube2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  fetchAiSettings,
  saveAiSettings,
  testAiSettings,
  type AiProviderName,
  type AiSettingsPayload,
} from "@/lib/api";

interface AiSettingsForm {
  provider: AiProviderName;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: string;
  maxTokens: string;
  requestTimeoutMs: string;
}

const providerOptions: Array<{ value: AiProviderName; label: string; defaultBaseUrl: string; defaultModel: string; requiresApiKey: boolean }> = [
  { value: "openai", label: "OpenAI", defaultBaseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o-mini", requiresApiKey: true },
  { value: "deepseek", label: "DeepSeek", defaultBaseUrl: "https://api.deepseek.com/v1", defaultModel: "deepseek-chat", requiresApiKey: true },
  { value: "anthropic", label: "Anthropic Claude", defaultBaseUrl: "https://api.anthropic.com/v1", defaultModel: "claude-3-5-sonnet-latest", requiresApiKey: true },
  { value: "gemini", label: "Google Gemini", defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta", defaultModel: "gemini-1.5-flash", requiresApiKey: true },
  { value: "ollama", label: "Ollama", defaultBaseUrl: "http://localhost:11434", defaultModel: "llama3.1", requiresApiKey: false },
  { value: "custom", label: "Custom OpenAI-compatible", defaultBaseUrl: "https://api.openai.com/v1", defaultModel: "", requiresApiKey: true },
];

const defaultForm: AiSettingsForm = {
  provider: "openai",
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "",
  temperature: "0.7",
  maxTokens: "2048",
  requestTimeoutMs: "30000",
};

export default function AiSettingsPage() {
  const [form, setForm] = useState<AiSettingsForm>(defaultForm);
  const [apiKeyMasked, setApiKeyMasked] = useState("");
  const [configured, setConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedProvider = useMemo(
    () => providerOptions.find((provider) => provider.value === form.provider) ?? providerOptions[0],
    [form.provider],
  );

  useEffect(() => {
    let isCurrent = true;

    void fetchAiSettings()
      .then((settings) => {
        if (!isCurrent) return;
        setConfigured(settings.configured);
        setApiKeyMasked(settings.apiKeyMasked);
        setForm({
          provider: settings.provider,
          apiKey: "",
          baseUrl: settings.baseUrl,
          model: settings.model,
          temperature: String(settings.temperature),
          maxTokens: String(settings.maxTokens),
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
    const nextProvider = providerOptions.find((option) => option.value === provider) ?? providerOptions[0];
    setForm((current) => ({
      ...current,
      provider,
      baseUrl: nextProvider.defaultBaseUrl,
      model: current.model || nextProvider.defaultModel,
      apiKey: provider === "ollama" ? "" : current.apiKey,
    }));
  };

  const buildPayload = (): AiSettingsPayload => ({
    provider: form.provider,
    apiKey: form.apiKey.trim(),
    baseUrl: form.baseUrl.trim(),
    model: form.model.trim(),
    temperature: Number(form.temperature),
    maxTokens: Number(form.maxTokens),
    requestTimeoutMs: Number(form.requestTimeoutMs),
  });

  const validate = (): string | null => {
    if (!form.model.trim()) return "请填写 Model";
    if (selectedProvider.requiresApiKey && !form.apiKey.trim() && !apiKeyMasked) return "请填写 API Key";
    if (!Number.isFinite(Number(form.temperature))) return "Temperature 必须是数字";
    if (!Number.isInteger(Number(form.maxTokens)) || Number(form.maxTokens) <= 0) return "Max Tokens 必须是正整数";
    if (!Number.isInteger(Number(form.requestTimeoutMs)) || Number(form.requestTimeoutMs) <= 0) return "请求超时时间必须是正整数";
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
      setConfigured(saved.configured);
      setApiKeyMasked(saved.apiKeyMasked);
      setForm((current) => ({ ...current, apiKey: "" }));
      setMessage("AI 配置已保存");
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
      setMessage(`连接成功：${result.model}`);
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
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">AI 配置</h1>
              <p className="mt-1 text-sm text-muted-foreground">配置 Provider、API Key、Base URL 和模型参数。</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant={configured ? "secondary" : "outline"}>{configured ? "已配置" : "未配置"}</Badge>
                {apiKeyMasked && <Badge variant="outline">Key: {apiKeyMasked}</Badge>}
              </div>
            </div>
          </div>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
            <ArrowLeft className="size-4" />
            返回 Dashboard
          </Link>
        </header>

        {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
        {message && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</div>}

        <Card>
          <CardHeader>
            <CardTitle>模型连接配置</CardTitle>
            <CardDescription>支持 OpenAI、DeepSeek、Anthropic、Gemini、Ollama 和任意 OpenAI 兼容端点。</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">正在加载 AI 配置...</div>
            ) : (
              <form className="grid gap-5" onSubmit={handleSave}>
                <FormField label="Provider" htmlFor="provider">
                  <select
                    id="provider"
                    aria-label="Provider"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={form.provider}
                    onChange={(event) => handleProviderChange(event.target.value as AiProviderName)}
                  >
                    {providerOptions.map((provider) => (
                      <option key={provider.value} value={provider.value}>{provider.label}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="API Key" htmlFor="api-key" description={selectedProvider.requiresApiKey ? "不会回显完整密钥；留空保存时会保留已有密钥。" : "Ollama 本地模型通常不需要 API Key。"}>
                  <Input
                    id="api-key"
                    aria-label="API Key"
                    type="password"
                    autoComplete="off"
                    placeholder={apiKeyMasked || (selectedProvider.requiresApiKey ? "sk-..." : "可留空")}
                    value={form.apiKey}
                    onChange={(event) => setForm((current) => ({ ...current, apiKey: event.target.value }))}
                  />
                </FormField>

                <FormField label="Base URL" htmlFor="base-url">
                  <Input id="base-url" value={form.baseUrl} onChange={(event) => setForm((current) => ({ ...current, baseUrl: event.target.value }))} />
                </FormField>

                <FormField label="Model" htmlFor="model">
                  <Input id="model" aria-label="Model" value={form.model} placeholder={selectedProvider.defaultModel || "输入模型名称"} onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} />
                </FormField>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Temperature" htmlFor="temperature">
                    <Input id="temperature" aria-label="Temperature" inputMode="decimal" value={form.temperature} onChange={(event) => setForm((current) => ({ ...current, temperature: event.target.value }))} />
                  </FormField>
                  <FormField label="Max Tokens" htmlFor="max-tokens">
                    <Input id="max-tokens" aria-label="Max Tokens" inputMode="numeric" value={form.maxTokens} onChange={(event) => setForm((current) => ({ ...current, maxTokens: event.target.value }))} />
                  </FormField>
                </div>
                <FormField label="请求超时 (ms)" htmlFor="request-timeout" description="生成日报等大任务建议设为 120000 (2 分钟)">
                  <Input id="request-timeout" aria-label="请求超时" inputMode="numeric" value={form.requestTimeoutMs} onChange={(event) => setForm((current) => ({ ...current, requestTimeoutMs: event.target.value }))} />
                </FormField>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    保存配置
                  </Button>
                  <Button type="button" variant="outline" onClick={handleTest} disabled={isTesting}>
                    {isTesting ? <Loader2 className="size-4 animate-spin" /> : <TestTube2 className="size-4" />}
                    测试连接
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
