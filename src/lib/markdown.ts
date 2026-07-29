import { Marked } from "marked";
import { codeToHtml } from "shiki";
import { sanitizeHtml } from "@/lib/sanitize";

// The sanitizer allowlist (and the reasoning behind it) lives in
// src/lib/sanitize.ts so the admin markdown preview — a client component that
// must not pull `shiki` into the browser bundle — can share it.
export { sanitizeHtml } from "@/lib/sanitize";

export async function renderMarkdown(md: string): Promise<string> {
  const marked = new Marked({ async: true, gfm: true });
  marked.use({
    async: true,
    walkTokens: async (token) => {
      if (token.type !== "code") return;
      let html: string;
      try {
        html = await codeToHtml(token.text, {
          lang: token.lang || "text",
          themes: { light: "github-light", dark: "github-dark" },
        });
      } catch {
        html = await codeToHtml(token.text, {
          lang: "text",
          themes: { light: "github-light", dark: "github-dark" },
        });
      }
      const t = token as unknown as { type: string; text: string };
      t.type = "html";
      t.text = html;
    },
  });
  const rendered = (await marked.parse(md)) as string;
  return sanitizeHtml(rendered);
}
