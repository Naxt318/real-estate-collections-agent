// Client-side checks for the sign-in and request-access forms. They give fast feedback only; the
// backend must validate everything again when the forms are connected.
import { z } from 'zod';

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/** Placeholder until the backend team confirms the Phase 1b password policy. */
export const MIN_PASSWORD_LENGTH = 12;

const emailSchema = z.email();

function emailError(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return 'Enter your email address';
  if (!emailSchema.safeParse(trimmed).success) return 'Enter a valid email address';
  return undefined;
}

function compact<K extends string>(errors: Record<K, string | undefined>): FieldErrors<K> {
  return Object.fromEntries(
    Object.entries(errors).filter(([, message]) => message !== undefined),
  ) as FieldErrors<K>;
}

export function validateLogin(input: {
  email: string;
  password: string;
}): FieldErrors<'email' | 'password'> {
  return compact({
    email: emailError(input.email),
    password: input.password ? undefined : 'Enter your password',
  });
}

export function validateForgotPassword(input: { email: string }): FieldErrors<'email'> {
  return compact({ email: emailError(input.email) });
}

export function validateResetPassword(input: {
  password: string;
  confirmPassword: string;
}): FieldErrors<'password' | 'confirmPassword'> {
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return { password: `Use at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (!input.confirmPassword) {
    return { confirmPassword: 'Re-enter your new password' };
  }
  if (input.password !== input.confirmPassword) {
    return { confirmPassword: 'Passwords do not match' };
  }
  return {};
}

function requiredText(value: string, message: string): string | undefined {
  return value.trim() ? undefined : message;
}

// Spaces, dashes, dots and brackets are allowed as separators; what is left must be
// an optional leading + and 10 to 15 digits (E.164 allows at most 15).
const PHONE_DIGITS = /^\+?\d{10,15}$/;

function phoneError(phone: string): string | undefined {
  const trimmed = phone.trim();
  if (!trimmed) return 'Enter your phone number';
  if (!PHONE_DIGITS.test(trimmed.replace(/[\s().-]/g, ''))) return 'Enter a valid phone number';
  return undefined;
}

export function validateRequestAccess(input: {
  company: string;
  name: string;
  email: string;
  phone: string;
}): FieldErrors<'company' | 'name' | 'email' | 'phone'> {
  return compact({
    company: requiredText(input.company, 'Enter your company name'),
    name: requiredText(input.name, 'Enter your full name'),
    email: emailError(input.email),
    phone: phoneError(input.phone),
  });
}
