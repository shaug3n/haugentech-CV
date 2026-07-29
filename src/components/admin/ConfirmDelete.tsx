"use client";

export function ConfirmDelete({ action, id }: {
  action: (fd: FormData) => Promise<void>; id: string;
}) {
  return (
    <form action={action}
      onSubmit={(e) => { if (!confirm("Delete this item?")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button className="text-sm text-red-600 hover:underline">Delete</button>
    </form>
  );
}
