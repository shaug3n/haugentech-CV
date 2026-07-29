const ERROR_MESSAGES: Record<string, string> = {
  // Generic fallback for any rejected write or failed validation.
  error: "Something went wrong — check the form values.",
  // posts.slug is unique; see src/app/admin/posts/actions.ts.
  "slug-taken": "That slug is already taken.",
};

export function StatusBanner({ status }: { status?: string }) {
  if (status === "saved")
    return <p className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">Saved.</p>;

  const message = status ? ERROR_MESSAGES[status] : undefined;
  if (message)
    return <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{message}</p>;

  return null;
}
