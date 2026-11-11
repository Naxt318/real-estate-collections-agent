'use client';

import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/password-field';
import {
  MIN_PASSWORD_LENGTH,
  validateResetPassword,
  type FieldErrors,
} from '@/lib/auth-validation';
import { AuthLink } from './auth-link';

export function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<'password' | 'confirmPassword'>>({});
  const [notice, setNotice] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateResetPassword({ password, confirmPassword });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setNotice(null);
      return;
    }
    // TODO(Phase 1b): send the new password and the ?token= from the reset
    // link to the API here.
    setNotice("Password reset isn't connected yet.");
  }

  return (
    <div className="flex flex-col gap-6">
      {notice && <Alert tone="info">{notice}</Alert>}
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <PasswordField
          label="New password"
          name="password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
        />
        <PasswordField
          label="Confirm new password"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          required
        />
        <Button type="submit" className="w-full">
          Update password
        </Button>
      </form>
      <div className="text-center">
        <AuthLink href="/login">Back to sign in</AuthLink>
      </div>
    </div>
  );
}
