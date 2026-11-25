'use client';

import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { MailIcon } from '@/components/ui/icons';
import { TextField } from '@/components/ui/text-field';
import { validateRequestAccess, type FieldErrors } from '@/lib/auth-validation';
import { AuthLink } from './auth-link';

type Field = 'company' | 'name' | 'email' | 'phone';

const EMPTY: Record<Field, string> = { company: '', name: '', email: '', phone: '' };

/**
 * Builders can't create their own account: they ask for access, and the
 * platform team approves the request before an account is set up.
 */
export function RequestAccessForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [notice, setNotice] = useState<string | null>(null);

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateRequestAccess(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setNotice(null);
      return;
    }
    // TODO(Phase 1b): send the request to the access-request API here. The
    // backend must validate it again and must not create an account itself.
    setNotice("Access requests aren't connected yet.");
  }

  return (
    <div className="flex flex-col gap-6">
      {notice && <Alert tone="info">{notice}</Alert>}
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Company"
          name="company"
          autoComplete="organization"
          placeholder="Your company's name"
          value={values.company}
          onChange={(e) => update('company', e.target.value)}
          error={errors.company}
          required
        />
        <TextField
          label="Full name"
          name="name"
          autoComplete="name"
          value={values.name}
          onChange={(e) => update('name', e.target.value)}
          error={errors.name}
          required
        />
        <TextField
          label="Work email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          icon={<MailIcon />}
          value={values.email}
          onChange={(e) => update('email', e.target.value)}
          error={errors.email}
          required
        />
        <TextField
          label="Phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          value={values.phone}
          onChange={(e) => update('phone', e.target.value)}
          error={errors.phone}
          required
        />
        <Button type="submit" className="w-full">
          Request access
        </Button>
      </form>
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Already have an account? <AuthLink href="/login">Sign in</AuthLink>
      </p>
    </div>
  );
}
