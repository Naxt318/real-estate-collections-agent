import type { ButtonHTMLAttributes } from 'react';
import { SpinnerIcon } from './spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'inverted';
export type ButtonSize = 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-indigo-600/60',
  secondary:
    'border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800',
  danger: 'bg-red-600 text-white hover:bg-red-500 disabled:bg-red-600/60',
  ghost: 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
  /** For dark or brand-coloured backgrounds. */
  inverted: 'bg-white text-indigo-900 hover:bg-indigo-50',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'rounded-md px-4 py-2 font-medium',
  lg: 'rounded-lg px-5 py-3 font-semibold',
};

/**
 * Class names for something that should look like a button, e.g. a Next.js
 * <Link>. Keeps links and buttons styled from one place.
 */
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  return `inline-flex items-center justify-center gap-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]}`;
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, disables the button and marks it busy. */
  loading?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  type = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonClasses(variant, size)} ${className}`}
      {...rest}
    >
      {loading && <SpinnerIcon />}
      {children}
    </button>
  );
}
