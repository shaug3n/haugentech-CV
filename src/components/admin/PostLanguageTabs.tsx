"use client";

import { useState } from "react";
import { PostBodyEditor } from "@/components/admin/PostBodyEditor";
import { TextField } from "@/components/admin/fields";

type Language = "en" | "no";

export function PostLanguageTabs({
  titleEn,
  bodyMdEn,
  titleNo,
  bodyMdNo,
}: {
  titleEn: string | null;
  bodyMdEn: string | null;
  titleNo: string | null;
  bodyMdNo: string | null;
}) {
  const [activeLanguage, setActiveLanguage] = useState<Language>("en");

  return (
    <section>
      <div role="tablist" aria-label="Post language" className="mb-4 flex gap-2 border-b border-neutral-200">
        <button
          id="post-tab-en"
          type="button"
          role="tab"
          aria-selected={activeLanguage === "en"}
          aria-controls="post-panel-en"
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            activeLanguage === "en"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
          onClick={() => setActiveLanguage("en")}
        >
          English
        </button>
        <button
          id="post-tab-no"
          type="button"
          role="tab"
          aria-selected={activeLanguage === "no"}
          aria-controls="post-panel-no"
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            activeLanguage === "no"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
          onClick={() => setActiveLanguage("no")}
        >
          Norsk
        </button>
      </div>
      <div
        id="post-panel-en"
        role="tabpanel"
        aria-labelledby="post-tab-en"
        hidden={activeLanguage !== "en"}
        className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4"
      >
        <TextField name="title_en" label="Title" defaultValue={titleEn} />
        <PostBodyEditor
          name="body_md_en"
          label="Body (markdown)"
          defaultValue={bodyMdEn}
        />
      </div>
      <div
        id="post-panel-no"
        role="tabpanel"
        aria-labelledby="post-tab-no"
        hidden={activeLanguage !== "no"}
        className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4"
      >
        <TextField name="title_no" label="Tittel" defaultValue={titleNo} />
        <PostBodyEditor
          name="body_md_no"
          label="Innhold (markdown)"
          defaultValue={bodyMdNo}
        />
      </div>
    </section>
  );
}
