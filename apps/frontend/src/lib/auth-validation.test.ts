import { describe, expect, it } from 'vitest';
import { validateForgotPassword, validateLogin, validateResetPassword } from './auth-validation';

describe('validateLogin', () => {
  it('accepts a valid email and any non-empty password', () => {
    expect(validateLogin({ email: 'priya@example.com', password: 'x' })).toEqual({});
  });

  it('requires an email', () => {
    expect(validateLogin({ email: '', password: 'x' })).toEqual({
      email: 'Enter your email address',
    });
  });

  it('rejects a malformed email', () => {
    expect(validateLogin({ email: 'priya@', password: 'x' })).toEqual({
      email: 'Enter a valid email address',
    });
  });

  it('ignores surrounding spaces in the email', () => {
    expect(validateLogin({ email: '  priya@example.com ', password: 'x' })).toEqual({});
  });

  it('requires a password', () => {
    expect(validateLogin({ email: 'priya@example.com', password: '' })).toEqual({
      password: 'Enter your password',
    });
  });

  it('reports both problems at once', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: 'Enter your email address',
      password: 'Enter your password',
    });
  });
});

describe('validateForgotPassword', () => {
  it('accepts a valid email', () => {
    expect(validateForgotPassword({ email: 'priya@example.com' })).toEqual({});
  });

  it('rejects a missing or malformed email', () => {
    expect(validateForgotPassword({ email: '' })).toEqual({ email: 'Enter your email address' });
    expect(validateForgotPassword({ email: 'nope' })).toEqual({
      email: 'Enter a valid email address',
    });
  });
});

describe('validateResetPassword', () => {
  it('accepts matching passwords of 12 or more characters', () => {
    expect(
      validateResetPassword({ password: 'correct horse', confirmPassword: 'correct horse' }),
    ).toEqual({});
  });

  it('rejects passwords shorter than 12 characters', () => {
    expect(validateResetPassword({ password: 'short', confirmPassword: 'short' })).toEqual({
      password: 'Use at least 12 characters',
    });
  });

  it('asks for the confirmation when it is empty', () => {
    expect(validateResetPassword({ password: 'correct horse', confirmPassword: '' })).toEqual({
      confirmPassword: 'Re-enter your new password',
    });
  });

  it('rejects passwords that do not match', () => {
    expect(
      validateResetPassword({ password: 'correct horse', confirmPassword: 'correct horses' }),
    ).toEqual({ confirmPassword: 'Passwords do not match' });
  });
});
