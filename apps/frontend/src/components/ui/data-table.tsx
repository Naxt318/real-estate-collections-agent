import type { ReactNode } from 'react';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { Pagination, type PaginationProps } from './pagination';
import { Spinner } from './spinner';

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
};

export type DataTableProps<T> = {
  /** Names the table for screen readers. */
  caption: string;
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  /** When set, replaces the rows with an error message. */
  error?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  pagination?: PaginationProps;
};

const ALIGN_CLASSES = { left: 'text-left', right: 'text-right' } as const;

export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowKey,
  loading = false,
  error,
  onRetry,
  emptyTitle = 'Nothing to show yet',
  emptyDescription,
  pagination,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner label={`Loading ${caption}`} />
      </div>
    );
  }
  if (error) {
    return <ErrorState title={error} onRetry={onRetry} />;
  }
  if (rows.length === 0) {
    // Keep pagination when other pages have rows, so the user is never stranded.
    return (
      <div>
        <EmptyState title={emptyTitle} description={emptyDescription} />
        {pagination && pagination.total > 0 && <Pagination {...pagination} />}
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400 ${ALIGN_CLASSES[column.align ?? 'left']}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
            {rows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 text-zinc-900 dark:text-zinc-100 ${ALIGN_CLASSES[column.align ?? 'left']} ${column.align === 'right' ? 'tabular-nums' : ''}`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && <Pagination {...pagination} />}
    </div>
  );
}
