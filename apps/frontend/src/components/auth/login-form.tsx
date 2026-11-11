'use client';

import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { GoogleIcon, MailIcon } from '@/components/ui/icons';
import { PasswordField } from '@/components/ui/password-field';
import { TextField } from '@/components/ui/text-field';
import { validateLogin, type FieldErrors } from '@/lib/auth-validation';
import { AuthLink } from './auth-link';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<'email' | 'password'>>({});
  const [notice, setNotice] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateLogin({ email, password });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setNotice(null);
      return;
    }
    // TODO(Phase 1b): call the sign-in API here.
    setNotice("Sign-in isn't connected yet.");
  }

  function handleCreateAccount() {
    // TODO: decide whether builders sign up themselves or request access.
    setNotice("Account sign-up isn't available yet.");
  }

  function handleGoogle() {
    // TODO(Phase 1b): start the Google sign-in flow here.
    setNotice("Google sign-in isn't connected yet.");
  }

  return (
    <div className="flex flex-col gap-6">
      {notice && <Alert tone="info">{notice}</Alert>}

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          icon={<MailIcon />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <div className="flex justify-end">
          <AuthLink href="/forgot-password">Forgot password?</AuthLink>
        </div>
        <Button type="submit" className="w-full py-2.5">
          Sign in
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        or
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <Button variant="secondary" className="w-full" onClick={handleGoogle}>
        <GoogleIcon className="size-5" />
        Continue with Google
      </Button>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        New here?{' '}
        <button
          type="button"
          onClick={handleCreateAccount}
          className="font-medium text-indigo-600 hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-600 dark:text-indigo-400"
        >
          Create an account
        </button>
      </p>
    </div>
  );
}
