import Link from 'next/link';

export type NavItem = { href: string; label: string };

function isCurrent(href: string, currentPath: string): boolean {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export type SideNavProps = {
  items: NavItem[];
  currentPath: string;
  onNavigate?: () => void;
};

export function SideNav({ items, currentPath, onNavigate }: SideNavProps) {
  return (
    <nav aria-label="Main">
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const current = isCurrent(item.href, currentPath);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? 'page' : undefined}
                onClick={onNavigate}
                className={`block rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-indigo-600 ${
                  current
                    ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
