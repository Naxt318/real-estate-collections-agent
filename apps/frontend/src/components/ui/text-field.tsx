import { useId, type InputHTMLAttributes } from 'react';

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  /** Helper text shown under the input. */
  hint?: string;
  /** Validation message. Marks the input invalid when set. */
  error?: string;
};

/** A labelled text input with optional hint and error, wired up for screen readers. */
export function TextField({
  label,
  hint,
  error,
  required,
  className = '',
  ...rest
}: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {label}
        {required && (
          <span aria-hidden="true" className="text-red-600">
            {' '}
            *
          </span>
        )}
      </label>
      <input
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-indigo-600 aria-invalid:border-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        {...rest}
      />
      {hint && (
        <p id={hintId} className="text-xs text-zinc-500 dark:text-zinc-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
