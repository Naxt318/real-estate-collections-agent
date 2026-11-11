export type StatTileProps = {
  label: string;
  /** Already formatted by the caller, e.g. with formatInr. */
  value: string;
  hint?: string;
};

export function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <dl className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <dt className="text-sm text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        {value}
      </dd>
      {hint && <dd className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</dd>}
    </dl>
  );
}
