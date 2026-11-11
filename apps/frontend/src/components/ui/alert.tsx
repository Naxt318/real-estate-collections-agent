import type { ReactNode } from 'react';

type Tone = 'info' | 'success' | 'warning' | 'error';

const TONE_CLASSES: Record<Tone, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100',
  success:
    'border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100',
  warning:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100',
  error:
    'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100',
};

/** Errors and warnings interrupt screen readers (role="alert"); info and success wait (role="status"). */
export function Alert({
  tone,
  title,
  children,
}: {
  tone: Tone;
  title?: string;
  children: ReactNode;
}) {
  const role = tone === 'error' || tone === 'warning' ? 'alert' : 'status';
  return (
    <div role={role} className={`rounded-md border px-4 py-3 text-sm ${TONE_CLASSES[tone]}`}>
      {title && <p className="font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}
