'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/error-state';

/**
 * Shown when a page throws while rendering. Never shows the error itself to
 * the user (it may contain internal details); logs it for debugging instead.
 */
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center bg-white px-4 py-16 dark:bg-zinc-950">
      <ErrorState description="We couldn't load this page. Please try again." onRetry={reset} />
    </main>
  );
}
