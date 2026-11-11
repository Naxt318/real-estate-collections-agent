import { useId, type ReactNode } from 'react';

const CARD_CLASSES =
  'rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900';

/** A bordered panel. With a title it becomes a labelled region with a heading. */
export function Card({ title, children }: { title?: string; children: ReactNode }) {
  const headingId = useId();
  if (!title) {
    return <div className={CARD_CLASSES}>{children}</div>;
  }
  return (
    <section aria-labelledby={headingId} className={CARD_CLASSES}>
      <h2 id={headingId} className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h2>
      {children}
    </section>
  );
}
