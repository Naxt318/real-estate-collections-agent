'use client';

import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { validateForgotPassword, type FieldErrors } from '@/lib/auth-validation';
import { AuthLink } from './auth-link';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors<'email'>>({});
  const [notice, setNotice] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateForgotPassword({ email });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setNotice(null);
      return;
    }
    // TODO(Phase 1b): call the password-reset API here. Its success message
    // must not reveal whether an account exists for the email.
    setNotice("Password reset isn't connected yet.");
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
        />
        <Button type="submit" className="w-full">
          Send reset link
        </Button>
      </form>
      <div className="text-center">
        <AuthLink href="/login">Back to sign in</AuthLink>
      </div>
    </div>
  );
}
