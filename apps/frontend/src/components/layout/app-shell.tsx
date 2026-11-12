'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { CloseIcon, MenuIcon } from '@/components/ui/icons';
import { SideNav, type NavItem } from './side-nav';

export type AppShellProps = {
  navItems: NavItem[];
  /** Shown at the right of the top bar, e.g. the signed-in user. */
  topBarEnd?: ReactNode;
  children: ReactNode;
};

const ICON_BUTTON =
  'rounded-md p-2 text-zinc-600 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-indigo-600 md:hidden dark:text-zinc-300 dark:hover:bg-zinc-800';

/**
 * Sidebar + top bar layout. On small screens the sidebar opens over the page
 * from a menu button, and closes with its close button, the backdrop, Escape
 * or choosing a link.
 */
export function AppShell({ navItems, topBarEnd, children }: AppShellProps) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const sidebarId = useId();

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [navOpen]);

  return (
    <div className="flex min-h-full flex-1 bg-zinc-50 dark:bg-zinc-950">
      {navOpen && (
        <div
          data-testid="nav-backdrop"
          aria-hidden="true"
          className="fixed inset-0 z-10 bg-zinc-950/40 md:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}
      <aside
        id={sidebarId}
        className={`${navOpen ? 'block' : 'hidden'} fixed inset-y-0 left-0 z-20 w-64 border-r border-zinc-200 bg-white p-4 md:static md:block dark:border-zinc-800 dark:bg-zinc-900`}
      >
        <div className="mb-6 flex items-center justify-between gap-2 px-3">
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Collections Intelligence
          </p>
          <button
            type="button"
            aria-label="Close menu"
            className={ICON_BUTTON}
            onClick={() => setNavOpen(false)}
          >
            <CloseIcon />
          </button>
        </div>
        <SideNav items={navItems} currentPath={pathname} onNavigate={() => setNavOpen(false)} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            className={ICON_BUTTON}
            aria-controls={sidebarId}
            aria-expanded={navOpen}
            aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setNavOpen((open) => !open)}
          >
            <MenuIcon />
          </button>
          <div className="ml-auto">{topBarEnd}</div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
