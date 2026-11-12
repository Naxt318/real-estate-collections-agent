import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { buttonClasses } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-white px-4 py-16 text-center dark:bg-zinc-950">
      <Logo />
      <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">404</p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Page not found
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link href="/" className={buttonClasses('primary', 'lg')}>
        Go to home page
      </Link>
    </main>
  );
}
