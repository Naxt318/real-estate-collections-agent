// Small inline icons. All are decorative (aria-hidden); pair them with text.
type IconProps = { className?: string };

export function MailIcon({ className = 'size-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M3 4a2 2 0 0 0-2 2v1.16l8.37 4.65a1.3 1.3 0 0 0 1.26 0L19 7.16V6a2 2 0 0 0-2-2H3Z" />
      <path d="m19 8.88-7.65 4.25a2.8 2.8 0 0 1-2.7 0L1 8.88V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.88Z" />
    </svg>
  );
}

export function LockIcon({ className = 'size-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function EyeIcon({ className = 'size-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path
        fillRule="evenodd"
        d="M.66 10.59a1.65 1.65 0 0 1 0-1.19A10 10 0 0 1 10 3c4.26 0 7.9 2.66 9.34 6.41.15.38.15.81 0 1.19A10 10 0 0 1 10 17c-4.26 0-7.9-2.66-9.34-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function EyeOffIcon({ className = 'size-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.75-1.75a10.05 10.05 0 0 0 3.3-4.38 1.65 1.65 0 0 0 0-1.19A10 10 0 0 0 9.99 3a9.96 9.96 0 0 0-4.57 1.1L3.28 2.22ZM7.75 6.7l1.09 1.09a2.5 2.5 0 0 1 3.37 3.37l1.09 1.09A4 4 0 0 0 7.75 6.7Z"
        clipRule="evenodd"
      />
      <path d="M10.75 12.94 7.06 9.25a2.5 2.5 0 0 0 3.69 3.69ZM15.58 15.64l-2.1-2.1A4 4 0 0 1 6.46 6.52L3.83 3.9A10 10 0 0 0 .66 9.4a1.65 1.65 0 0 0 0 1.2A10 10 0 0 0 10 17a9.96 9.96 0 0 0 5.58-1.36Z" />
    </svg>
  );
}

/** The multi-colour Google "G", for the Google sign-in button. */
export function GoogleIcon({ className = 'size-4' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.61 20.08H42V20H24v8h11.3C33.65 32.66 29.22 36 24 36c-6.63 0-12-5.37-12-12s5.37-12 12-12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66C34.05 6.05 29.27 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.34-.14-2.65-.39-3.92Z"
      />
      <path
        fill="#FF3D00"
        d="m6.31 14.69 6.57 4.82C14.66 15.11 18.96 12 24 12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66C34.05 6.05 29.27 4 24 4 16.32 4 9.66 8.34 6.31 14.69Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.17 0 9.86-1.98 13.41-5.19l-6.19-5.24A11.9 11.9 0 0 1 24 36c-5.2 0-9.62-3.32-11.28-7.95l-6.52 5.02C9.51 39.56 16.23 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.61 20.08H42V20H24v8h11.3a12.04 12.04 0 0 1-4.09 5.57l6.19 5.24C36.97 39.2 44 34 44 24c0-1.34-.14-2.65-.39-3.92Z"
      />
    </svg>
  );
}

export function MenuIcon({ className = 'size-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 5A.75.75 0 0 1 2.75 9h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 9.75Zm0 5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

export function CloseIcon({ className = 'size-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}
