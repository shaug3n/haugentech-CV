"use server";
import { certificationSchema } from "@/lib/schemas";
import { createCrudActions } from "@/lib/admin/crud-actions";

const actions = createCrudActions({
  table: "certifications",
  path: "/admin/certifications",
  schema: certificationSchema,
  sortable: true,
  image: { field: "badge", folder: "certs", column: "badge_image_url" },
});

export const createCertification = actions.create;
export const updateCertification = actions.update;
export const deleteCertification = actions.remove;
export const moveCertification = actions.move;
