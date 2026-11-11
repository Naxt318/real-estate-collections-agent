/** Product mark + name. `inverted` is for dark backgrounds. */
export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <span
        aria-hidden="true"
        className={`inline-flex size-8 items-center justify-center rounded-lg text-sm font-bold ${
          inverted ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'
        }`}
      >
        CI
      </span>
      <span className={inverted ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}>
        Collections Intelligence
      </span>
    </span>
  );
}
