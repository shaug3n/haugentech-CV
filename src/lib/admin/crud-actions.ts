import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  formDataToRecord, requireUser, revalidateSite, uploadImage, withAdminAction,
} from "./action-utils";
import { moveItem, nextSort } from "./sortable";

/** A single optional image upload attached to a row. */
export interface CrudImageConfig {
  /** `name` of the `<input type="file">` in the editor form. */
  field: string;
  /** Folder inside the `media` bucket to upload into. */
  folder: string;
  /** Column that receives the resulting public URL. */
  column: string;
}

export interface CrudConfig {
  /** Supabase table name. */
  table: string;
  /** Admin route for this editor, e.g. `/admin/experience`. */
  path: string;
  /** Zod schema parsing the editor's form fields. */
  schema: z.ZodTypeAny;
  /** Table has a `sort` column and an up/down reorder UI. Adds `move`. */
  sortable?: boolean;
  /**
   * Populate `sort` with `nextSort()` on create. Defaults to `sortable`.
   * Skills is the odd one out: it has a `sort` column and has always assigned
   * one on create, but has no reorder UI — so it sets this without being
   * `sortable`. Flipping it off would silently leave every skill at sort 0.
   */
  assignSortOnCreate?: boolean;
  image?: CrudImageConfig;
}

type Action = (fd: FormData) => Promise<void>;
export interface CrudActions { create: Action; update: Action; remove: Action }
export interface SortableCrudActions extends CrudActions { move: Action }

/**
 * Builds the create/update/delete (+ reorder) server actions for one simple
 * content table. The experience, education, certifications, projects and skills
 * editors were five near-identical copies of this logic, and the copies had
 * drifted: every `delete` threw its Supabase `error` away and redirected to
 * `?status=saved` regardless, and so did every `move`. Centralising it means
 * "check the error before claiming success" holds by construction instead of by
 * remembering to copy it into the next editor.
 *
 * Posts deliberately does NOT use this: it has its own publish guard, an
 * id-scoped redirect target, `published_at` stamping, and duplicate-slug
 * reporting. See src/app/admin/posts/actions.ts.
 *
 * Every action is wrapped in `withAdminAction`, so an unexpected throw (a stale
 * session from `requireUser`, a failed upload, a failed `nextSort` read) lands
 * on the same error banner as a rejected write rather than crashing the shell.
 */
export function createCrudActions(config: CrudConfig & { sortable: true }): SortableCrudActions;
export function createCrudActions(config: CrudConfig & { sortable?: false }): CrudActions;
export function createCrudActions(config: CrudConfig): SortableCrudActions {
  const { table, path, schema, sortable = false, image } = config;
  const assignSortOnCreate = config.assignSortOnCreate ?? sortable;
  const errorPath = `${path}?status=error`;
  const savedPath = `${path}?status=saved`;

  /** Parse the form or bail to the error banner. */
  function parseOrFail(fd: FormData): Record<string, unknown> {
    const parsed = schema.safeParse(formDataToRecord(fd));
    if (!parsed.success) redirect(errorPath);
    return { ...(parsed.data as Record<string, unknown>) };
  }

  /**
   * Upload a newly chosen file and point the URL column at it. When no file was
   * chosen the column is left untouched, so saving an existing row without
   * re-picking the image keeps the current one instead of nulling it.
   */
  async function applyImage(
    supabase: SupabaseClient, fd: FormData, values: Record<string, unknown>,
  ): Promise<void> {
    if (!image) return;
    const file = fd.get(image.field);
    if (file instanceof File && file.size > 0) {
      values[image.column] = await uploadImage(supabase, file, image.folder);
    }
  }

  const create = withAdminAction(errorPath, async (fd: FormData) => {
    const supabase = await createSupabaseServer();
    await requireUser(supabase);
    const values = parseOrFail(fd);
    if (assignSortOnCreate) values.sort = await nextSort(supabase, table);
    await applyImage(supabase, fd, values);

    const { error } = await supabase.from(table).insert(values);
    if (error) redirect(errorPath);
    revalidateSite();
    redirect(savedPath);
  });

  const update = withAdminAction(errorPath, async (fd: FormData) => {
    const supabase = await createSupabaseServer();
    await requireUser(supabase);
    const id = String(fd.get("id"));
    const values = parseOrFail(fd);
    await applyImage(supabase, fd, values);

    const { error } = await supabase.from(table).update(values).eq("id", id);
    if (error) redirect(errorPath);
    revalidateSite();
    redirect(savedPath);
  });

  const remove = withAdminAction(errorPath, async (fd: FormData) => {
    const supabase = await createSupabaseServer();
    await requireUser(supabase);

    const { error } = await supabase.from(table).delete().eq("id", String(fd.get("id")));
    if (error) redirect(errorPath);
    revalidateSite();
    redirect(savedPath);
  });

  const move = withAdminAction(errorPath, async (fd: FormData) => {
    if (!sortable) throw new Error(`move is not available for non-sortable table "${table}"`);
    const supabase = await createSupabaseServer();
    await requireUser(supabase);

    const moved = await moveItem(
      supabase, table, String(fd.get("id")), fd.get("direction") === "up" ? "up" : "down",
    );
    if (!moved) redirect(errorPath);
    revalidateSite();
    redirect(path);
  });

  return { create, update, remove, move };
}
