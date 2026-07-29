"use server";
import { projectSchema } from "@/lib/schemas";
import { createCrudActions } from "@/lib/admin/crud-actions";

const actions = createCrudActions({
  table: "projects",
  path: "/admin/projects",
  schema: projectSchema,
  sortable: true,
  image: { field: "image", folder: "projects", column: "image_url" },
});

export const createProject = actions.create;
export const updateProject = actions.update;
export const deleteProject = actions.remove;
export const moveProject = actions.move;
