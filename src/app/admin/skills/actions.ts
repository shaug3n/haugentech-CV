"use server";
import { skillSchema } from "@/lib/schemas";
import { createCrudActions } from "@/lib/admin/crud-actions";

// Skills has no reorder UI (the public section groups by category), but the
// table does have a `sort` column and creates have always populated it — so
// `assignSortOnCreate` stays on while `sortable` (which is what adds `move`)
// does not. There is no update action either: a skill is name + category, and
// the editor deletes and re-adds instead of editing in place.
const actions = createCrudActions({
  table: "skills",
  path: "/admin/skills",
  schema: skillSchema,
  assignSortOnCreate: true,
});

export const createSkill = actions.create;
export const deleteSkill = actions.remove;
