import { Button } from './button';

export type PaginationProps = {
  /** 1-based page number. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  // A page past the end (e.g. after a filter shrank the total) has no range to show.
  const pastEnd = page > lastPage;
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const summary = pastEnd
    ? `Nothing on page ${page} of ${lastPage}`
    : `Showing ${first}–${last} of ${total}`;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 px-1 py-3">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{summary}</p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(pastEnd ? lastPage : page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          aria-label="Next page"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
