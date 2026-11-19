import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import type { NavItem } from '@/components/layout/side-nav';

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/customers', label: 'Customers' },
  { href: '/collections', label: 'Collections' },
  { href: '/analytics', label: 'Analytics' },
];

// TODO(Phase 1b): require a signed-in user on the server before rendering
// these pages. Today they show no data, so nothing is exposed; once they load
// tenant data, hiding the UI is not protection (CLAUDE.md §13, §16).
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell navItems={NAV_ITEMS}>{children}</AppShell>;
}
