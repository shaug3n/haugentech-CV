import { Marked } from "marked";

export async function renderMarkdown(md: string): Promise<string> {
  const marked = new Marked({ async: true, gfm: true });
  return marked.parse(md) as Promise<string>;
}
