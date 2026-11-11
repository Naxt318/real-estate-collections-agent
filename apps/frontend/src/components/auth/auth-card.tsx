import type { ReactNode } from 'react';

/** Centred card used by the sign-in pages. */
export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center text-sm font-semibold tracking-tight text-indigo-600 dark:text-indigo-400">
          Collections Intelligence
        </p>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
