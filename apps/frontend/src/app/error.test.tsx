/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ErrorPage from './error';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Error page', () => {
  it('tells the user something went wrong without showing the error details', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorPage error={new Error('secret stack detail')} reset={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.queryByText(/secret stack detail/)).not.toBeInTheDocument();
  });

  it('lets the user try again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const reset = vi.fn();
    render(<ErrorPage error={new Error('boom')} reset={reset} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('logs the error for debugging', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('boom');
    render(<ErrorPage error={error} reset={() => {}} />);
    expect(logged).toHaveBeenCalledWith(error);
  });
});
