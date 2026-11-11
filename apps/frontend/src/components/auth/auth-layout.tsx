import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/logo';

const BENEFITS = [
  'See every due and overdue instalment at a glance',
  'Let an AI assistant handle routine reminder calls',
  'Count only payments verified with the gateway',
];

/** Split-screen layout for the sign-in pages: brand panel left, form right. */
export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-full flex-1 lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-800 to-indigo-950 p-12 text-white lg:flex">
        <div
          aria-hidden="true"
          className="absolute -top-24 -right-24 size-96 rounded-full bg-indigo-500/30 blur-3xl"
        />
        <Link href="/" className="relative">
          <Logo inverted />
        </Link>
        <div className="relative max-w-md">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">
            AI collections intelligence for real estate developers.
          </h2>
          <ul className="mt-8 flex flex-col gap-4 text-indigo-100">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs"
                >
                  ✓
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-indigo-200/70">
          © {new Date().getFullYear()} Collections Intelligence
        </p>
      </aside>

      <main className="flex flex-col items-center justify-center bg-white px-6 py-12 dark:bg-zinc-950">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 inline-block lg:hidden">
            <Logo />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
          )}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
