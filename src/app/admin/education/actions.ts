"use server";
import { educationSchema } from "@/lib/schemas";
import { createCrudActions } from "@/lib/admin/crud-actions";

const actions = createCrudActions({
  table: "education",
  path: "/admin/education",
  schema: educationSchema,
  sortable: true,
});

export const createEducation = actions.create;
export const updateEducation = actions.update;
export const deleteEducation = actions.remove;
export const moveEducation = actions.move;
