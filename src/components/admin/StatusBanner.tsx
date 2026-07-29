export function StatusBanner({ status }: { status?: string }) {
  if (status === "saved")
    return <p className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">Saved.</p>;
  if (status === "error")
    return <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">Something went wrong — check the form values.</p>;
  return null;
}
