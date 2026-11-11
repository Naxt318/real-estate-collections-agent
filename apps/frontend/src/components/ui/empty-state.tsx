import { Button } from './button';

export type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
      {description && <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="secondary" className="mt-2" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
