import { Button } from './button';

export type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <p className="text-sm font-semibold text-red-700 dark:text-red-400">{title}</p>
      {description && <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
      {onRetry && (
        <Button variant="secondary" className="mt-2" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
