'use client';

import { useState } from 'react';
import { EyeIcon, EyeOffIcon, LockIcon } from './icons';
import { TextField, type TextFieldProps } from './text-field';

/** A password input with a show/hide toggle. */
export function PasswordField(props: Omit<TextFieldProps, 'type' | 'trailing' | 'icon'>) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      icon={<LockIcon />}
      trailing={
        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className="rounded-md p-1.5 text-zinc-400 hover:text-zinc-600 focus-visible:outline-2 focus-visible:outline-indigo-600 dark:hover:text-zinc-200"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
    />
  );
}
