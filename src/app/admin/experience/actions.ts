"use server";
import { experienceSchema } from "@/lib/schemas";
import { createCrudActions } from "@/lib/admin/crud-actions";

const actions = createCrudActions({
  table: "experience",
  path: "/admin/experience",
  schema: experienceSchema,
  sortable: true,
});

export const createExperience = actions.create;
export const updateExperience = actions.update;
export const deleteExperience = actions.remove;
export const moveExperience = actions.move;
