"use client";
import { useState } from "react";
import { Marked } from "marked";

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
          dangerouslySetInnerHTML={{ __html: new Marked({ gfm: true }).parse(value) as string }} />
      ) : (
        <textarea name={name} value={value} onChange={(e) => setValue(e.target.value)} rows={16}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs" />
      )}
      {preview && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
