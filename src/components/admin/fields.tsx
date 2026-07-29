export function TextField({ name, label, defaultValue, required }: {
  name: string; label: string; defaultValue?: string | null; required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input name={name} defaultValue={defaultValue ?? ""} required={required}
        className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" />
    </label>
  );
}

export function TextArea({ name, label, defaultValue, rows = 6 }: {
  name: string; label: string; defaultValue?: string | null; rows?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <textarea name={name} defaultValue={defaultValue ?? ""} rows={rows}
        className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs" />
    </label>
  );
}

export function LangPair({ children }: { children: [React.ReactNode, React.ReactNode] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-neutral-200 p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-neutral-400">EN</p>
        {children[0]}
      </div>
      <div className="rounded-lg border border-neutral-200 p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-neutral-400">NO</p>
        {children[1]}
      </div>
    </div>
  );
}
