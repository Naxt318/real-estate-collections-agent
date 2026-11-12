import Link from 'next/link';
import type { ReactNode } from 'react';

/** Indigo text-link style, shared by links and link-looking buttons. */
export const TEXT_LINK_CLASSES =
  'text-sm font-medium text-indigo-600 hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-600 dark:text-indigo-400';

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={TEXT_LINK_CLASSES}>
      {children}
    </Link>
  );
}
