/** @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, type Column } from './data-table';

type Row = { id: string; name: string; outstanding: string };

const columns: Column<Row>[] = [
  { key: 'name', header: 'Customer', cell: (row) => row.name },
  { key: 'outstanding', header: 'Outstanding', cell: (row) => row.outstanding, align: 'right' },
];

const rows: Row[] = [
  { id: 'c1', name: 'Demo Customer A', outstanding: '₹1,00,000.00' },
  { id: 'c2', name: 'Demo Customer B', outstanding: '₹2,50,000.00' },
];

function renderTable(props: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  return render(
    <DataTable
      caption="Customers"
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.id}
      {...props}
    />,
  );
}

describe('DataTable', () => {
  it('is a table named by its caption', () => {
    renderTable();
    expect(screen.getByRole('table', { name: 'Customers' })).toBeInTheDocument();
  });

  it('renders a column header per column', () => {
    renderTable();
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['Customer', 'Outstanding']);
  });

  it('renders a row per item with its cells', () => {
    renderTable();
    const bodyRows = screen.getAllByRole('row').slice(1);
    expect(bodyRows).toHaveLength(2);
    expect(
      within(bodyRows[0]!)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['Demo Customer A', '₹1,00,000.00']);
  });

  it('shows the empty state when there are no rows', () => {
    renderTable({ rows: [], emptyTitle: 'No customers yet' });
    expect(screen.getByText('No customers yet')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a loading status instead of rows while loading', () => {
    renderTable({ loading: true });
    expect(screen.getByRole('status', { name: 'Loading Customers' })).toBeInTheDocument();
    expect(screen.queryByText('Demo Customer A')).not.toBeInTheDocument();
  });

  it('shows the error with a retry instead of rows', async () => {
    const onRetry = vi.fn();
    renderTable({ error: 'Could not load customers', onRetry });
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load customers');
    expect(screen.queryByText('Demo Customer A')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows pagination when given', () => {
    renderTable({ pagination: { page: 1, pageSize: 2, total: 5, onPageChange: () => {} } });
    expect(screen.getByText('Showing 1–2 of 5')).toBeInTheDocument();
  });

  it('hides pagination when there are no rows', () => {
    renderTable({
      rows: [],
      pagination: { page: 1, pageSize: 2, total: 0, onPageChange: () => {} },
    });
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });
});
