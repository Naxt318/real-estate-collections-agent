import { describe, expect, it } from 'vitest';
import {
  validateForgotPassword,
  validateLogin,
  validateRequestAccess,
  validateResetPassword,
} from './auth-validation';

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

describe('validateRequestAccess', () => {
  const valid = {
    company: 'Skyline Developers',
    name: 'Priya Sharma',
    email: 'priya@skyline.example',
    phone: '+91 98765 43210',
  };

  it('accepts a complete request', () => {
    expect(validateRequestAccess(valid)).toEqual({});
  });

  it('requires every field', () => {
    expect(validateRequestAccess({ company: '', name: ' ', email: '', phone: '' })).toEqual({
      company: 'Enter your company name',
      name: 'Enter your full name',
      email: 'Enter your email address',
      phone: 'Enter your phone number',
    });
  });

  it('rejects a malformed work email', () => {
    expect(validateRequestAccess({ ...valid, email: 'priya@' })).toEqual({
      email: 'Enter a valid email address',
    });
  });

  it('accepts common phone formats', () => {
    for (const phone of ['9876543210', '+919876543210', '098765 43210', '+91-98765-43210']) {
      expect(validateRequestAccess({ ...valid, phone })).toEqual({});
    }
  });

  it('rejects phone numbers with letters or the wrong number of digits', () => {
    for (const phone of ['98765', '98765abcde', '+91 98765 43210 12345 6']) {
      expect(validateRequestAccess({ ...valid, phone })).toEqual({
        phone: 'Enter a valid phone number',
      });
    }
  });
});
