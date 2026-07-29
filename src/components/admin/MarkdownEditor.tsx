"use client";
import { useState } from "react";
import { Marked } from "marked";
import { sanitizeHtml } from "@/lib/sanitize";

// The preview goes through the same sanitizer as the real public rendering
// pipeline (see src/lib/markdown.ts), so it can't show HTML that production
// would strip — and a hostile payload pasted into a draft can't run against the
// signed-in admin session. Shiki highlighting stays server-only: code blocks
// preview as plain <pre><code>, which is a cosmetic difference, not a lie about
// what will be allowed through.

export function MarkdownEditor({ name, label, defaultValue }: {
  name: string; label: string; defaultValue?: string | null;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [preview, setPreview] = useState(false);
  return (
    <div className="text-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-medium">{label}</span>
        <button type="button" onClick={() => setPreview(!preview)}
          className="text-xs text-primary hover:underline">
          {preview ? "Edit" : "Preview"}
        </button>
      </div>
      {preview ? (
        <div className="prose-md min-h-48 rounded-lg border border-neutral-300 px-3 py-2"
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(new Marked({ gfm: true }).parse(value) as string),
          }} />
      ) : (
        <textarea name={name} value={value} onChange={(e) => setValue(e.target.value)} rows={16}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs" />
      )}
      {preview && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
