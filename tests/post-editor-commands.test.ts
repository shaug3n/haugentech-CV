import { describe, expect, it } from "vitest";
import { getPostEditorSlashItems } from "@/lib/admin/post-editor/slash-commands";

describe("post editor slash commands", () => {
  it("filters slash commands by label and keyword", () => {
    expect(getPostEditorSlashItems("h1").map(({ id }) => id)).toEqual(["heading-1"]);
    expect(getPostEditorSlashItems("quote").map(({ id }) => id)).toEqual(["blockquote"]);
    expect(getPostEditorSlashItems("no-match")).toEqual([]);
  });
});
