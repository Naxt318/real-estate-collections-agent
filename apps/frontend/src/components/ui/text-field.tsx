import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  /** Helper text shown under the input. */
  hint?: string;
  /** Validation message. Marks the input invalid when set. */
  error?: string;
  /** Decorative icon shown inside the input, on the left. */
  icon?: ReactNode;
  /** Control shown inside the input, on the right (e.g. a show-password button). */
  trailing?: ReactNode;
};

/** A labelled text input with optional hint and error, wired up for screen readers. */
export function TextField({
  label,
  hint,
  error,
  icon,
  trailing,
  required,
  className = '',
  'aria-describedby': callerDescribedBy,
  'aria-invalid': callerInvalid,
  ...rest
}: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  // Merge with the caller's own description, and never let a caller mark a
  // field with an error as valid.
  const describedBy =
    [callerDescribedBy, hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;
  const invalid = Boolean(error) || callerInvalid === true || callerInvalid === 'true';

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
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">
            {icon}
          </span>
        )}
        <input
          {...rest}
          id={id}
          required={required}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={`w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-indigo-600 aria-invalid:border-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 ${icon ? 'pl-9' : ''} ${trailing ? 'pr-10' : ''}`}
        />
        {trailing && (
          <span className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</span>
        )}
      </div>
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
