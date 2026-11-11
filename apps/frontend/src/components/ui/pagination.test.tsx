/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from './pagination';

describe('Pagination', () => {
  it('summarises the visible range', () => {
    render(<Pagination page={2} pageSize={10} total={45} onPageChange={() => {}} />);
    expect(screen.getByText('Showing 11–20 of 45')).toBeInTheDocument();
  });

  it('ends the range at the total on the last page', () => {
    render(<Pagination page={5} pageSize={10} total={45} onPageChange={() => {}} />);
    expect(screen.getByText('Showing 41–45 of 45')).toBeInTheDocument();
  });

  it('disables Previous on the first page', () => {
    render(<Pagination page={1} pageSize={10} total={45} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
  });

  it('disables Next on the last page', () => {
    render(<Pagination page={5} pageSize={10} total={45} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
  });

  it('asks for the next and previous page', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={3} pageSize={10} total={45} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange.mock.calls).toEqual([[4], [2]]);
  });

  it('is a labelled navigation landmark', () => {
    render(<Pagination page={1} pageSize={10} total={45} onPageChange={() => {}} />);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });
});
