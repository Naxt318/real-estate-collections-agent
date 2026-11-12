import type { ReactNode } from 'react';

/** Title row at the top of a dashboard page. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  /** Buttons shown at the right, e.g. "Export". */
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
