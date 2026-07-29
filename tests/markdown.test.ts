import { describe, it, expect } from "vitest";
import { renderMarkdown } from "@/lib/markdown";

describe("renderMarkdown", () => {
  it("renders basic markdown", async () => {
    const html = await renderMarkdown("# Hi\n\nsome **bold** text");
    expect(html).toContain("<h1");
    expect(html).toContain("<strong>bold</strong>");
  });
  it("highlights fenced code with shiki", async () => {
    const html = await renderMarkdown("```ts\nconst x = 1;\n```");
    expect(html).toContain("shiki");
  });
  it("survives unknown code language", async () => {
    const html = await renderMarkdown("```nosuchlang\nfoo\n```");
    expect(html).toContain("foo");
  });

  describe("sanitization", () => {
    it("strips <script> tags from the source", async () => {
      const html = await renderMarkdown("<script>alert('xss')</script>\n\nHello");
      expect(html).not.toContain("<script");
      expect(html).not.toContain("alert(");
    });

    it("strips onerror handlers from raw HTML images but keeps the image", async () => {
      const html = await renderMarkdown('<img src="x" onerror="alert(1)">');
      expect(html).not.toContain("onerror");
      expect(html).toContain("<img");
      expect(html).toContain('src="x"');
    });

    it("neutralizes javascript: URLs in links but keeps the link text", async () => {
      const html = await renderMarkdown("[click me](javascript:alert(1))");
      expect(html).not.toContain("javascript:");
      expect(html).toContain("<a");
      expect(html).toContain("click me");
    });

    it("strips <iframe> tags from the source", async () => {
      const html = await renderMarkdown('<iframe src="https://evil.example"></iframe>\n\nHello');
      expect(html).not.toContain("<iframe");
      expect(html).toContain("Hello");
    });

    it("strips <object> tags from the source", async () => {
      const html = await renderMarkdown('<object data="https://evil.example/x.swf"></object>\n\nHello');
      expect(html).not.toContain("<object");
      expect(html).toContain("Hello");
    });

    it("strips <embed> tags from the source", async () => {
      const html = await renderMarkdown('<embed src="https://evil.example/x.swf">\n\nHello');
      expect(html).not.toContain("<embed");
      expect(html).toContain("Hello");
    });

    it("strips URL-bearing style properties (e.g. background-image) from raw HTML", async () => {
      const html = await renderMarkdown(
        '<span style="background-image:url(https://evil.example/track.png)">tracked text</span>'
      );
      expect(html).not.toContain("background-image");
      expect(html).not.toContain("evil.example");
      expect(html).toContain("tracked text");
    });

    it("strips positioning/overlay style properties from raw HTML", async () => {
      const html = await renderMarkdown(
        '<span style="position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999">overlay text</span>'
      );
      expect(html).not.toContain("position:fixed");
      expect(html).not.toContain("z-index");
      expect(html).toContain("overlay text");
    });

    it("rejects non-colour values on allowed style properties", async () => {
      const html = await renderMarkdown(
        '<span style="color:url(https://evil.example/track.png)">smuggled value</span>'
      );
      expect(html).not.toContain("evil.example");
      expect(html).not.toContain("url(");
      expect(html).toContain("smuggled value");
    });

    it("preserves ordinary links", async () => {
      const html = await renderMarkdown("[a link](https://example.com)");
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain("a link");
    });

    it("preserves ordinary images", async () => {
      const html = await renderMarkdown("![alt text](https://example.com/img.png)");
      expect(html).toContain("<img");
      expect(html).toContain('src="https://example.com/img.png"');
      expect(html).toContain('alt="alt text"');
    });

    it("preserves gfm tables", async () => {
      const html = await renderMarkdown("| a | b |\n| - | - |\n| 1 | 2 |");
      expect(html).toContain("<table");
      expect(html).toContain("<td>1</td>");
      expect(html).toContain("<td>2</td>");
    });

    it("preserves shiki highlighting markup after sanitization", async () => {
      const html = await renderMarkdown("```ts\nconst x = 1;\n```");
      expect(html).toContain("shiki");
      expect(html).toContain("<span");
      // shiki's dual-theme output relies on inline style custom properties
      // surviving sanitization on nested spans, not just the outer <pre>.
      expect(html).toContain("--shiki-dark");
    });
  });
});
