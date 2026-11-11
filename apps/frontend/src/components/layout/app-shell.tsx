'use client';

import { usePathname } from 'next/navigation';
import { useId, useState, type ReactNode } from 'react';
import { SideNav, type NavItem } from './side-nav';

export type AppShellProps = {
  navItems: NavItem[];
  /** Shown at the right of the top bar, e.g. the signed-in user. */
  topBarEnd?: ReactNode;
  children: ReactNode;
};

/** Sidebar + top bar layout. On small screens the sidebar opens from a menu button. */
export function AppShell({ navItems, topBarEnd, children }: AppShellProps) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const sidebarId = useId();

  return (
    <div className="flex min-h-full flex-1 bg-zinc-50 dark:bg-zinc-950">
      <aside
        id={sidebarId}
        className={`${navOpen ? 'block' : 'hidden'} fixed inset-y-0 left-0 z-20 w-64 border-r border-zinc-200 bg-white p-4 md:static md:block dark:border-zinc-800 dark:bg-zinc-900`}
      >
        <p className="mb-6 px-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Collections Intelligence
        </p>
        <SideNav items={navItems} currentPath={pathname} onNavigate={() => setNavOpen(false)} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-indigo-600 md:hidden dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-controls={sidebarId}
            aria-expanded={navOpen}
            aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setNavOpen((open) => !open)}
          >
            <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 5A.75.75 0 0 1 2.75 9h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 9.75Zm0 5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" />
            </svg>
          </button>
          <div className="ml-auto">{topBarEnd}</div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
