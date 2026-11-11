import { getApiStatus } from '@/lib/api-status';

// Readiness must be checked on every request, never prerendered at build time.
export const dynamic = 'force-dynamic';

export default async function StatusPage() {
  const status = await getApiStatus();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold tracking-tight">Collections Intelligence</h1>
      <p
        className={
          status === 'ok' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
        }
      >
        {`API status: ${status}`}
      </p>
    </main>
  );
}
