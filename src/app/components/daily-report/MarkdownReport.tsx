import ReactMarkdown, { type Components } from "react-markdown";

import { cn } from "@/lib/utils";

interface MarkdownReportProps {
  markdown: string;
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="border-b pb-3 text-2xl font-semibold tracking-tight md:text-3xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-6 text-xl font-semibold tracking-tight">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-5 text-lg font-semibold tracking-tight">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="leading-7 text-foreground/90">{children}</p>,
  ul: ({ children }) => <ul className="ml-5 list-disc space-y-2 leading-7">{children}</ul>,
  ol: ({ children }) => <ol className="ml-5 list-decimal space-y-2 leading-7">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/30 bg-muted/30 py-2 pl-4 text-muted-foreground">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
    >
      {children}
    </a>
  ),
  code: ({ children, className }) => (
    <code className={cn("rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]", className)}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-lg border bg-background/80 p-3 text-sm leading-6">
      {children}
    </pre>
  ),
};
export function MarkdownReport({ markdown }: MarkdownReportProps) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4 text-sm leading-7 text-foreground shadow-sm md:p-5">
      <div className="space-y-4">
        <ReactMarkdown skipHtml components={markdownComponents}>
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}
