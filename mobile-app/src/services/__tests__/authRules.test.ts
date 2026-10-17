// src/services/__tests__/authRules.test.ts
//
// Sign-up and password rules shared by the mobile and web auth screens.
import { isValidEmail, validateNewPassword, validateSignUp } from '@coin-collecting/shared';

describe('auth rules', () => {
  it('checks email shape, ignoring surrounding spaces', () => {
    expect(isValidEmail(' collector@example.com ')).toBe(true);
    expect(isValidEmail('collector@example')).toBe(false);
    expect(isValidEmail('two words@example.com')).toBe(false);
  });

  it('accepts a good sign-up and names each problem', () => {
    expect(validateSignUp('a@b.co', 'secret', 'secret')).toEqual({});
    expect(validateSignUp('nope', '12345', '1234')).toEqual({
      email: 'Enter a valid email',
      password: 'At least 6 characters',
      confirm: "Doesn't match",
    });
  });

  it('asks for 8 characters on a new password', () => {
    expect(validateNewPassword('12345678', '12345678')).toEqual({});
    expect(validateNewPassword('1234567', 'x')).toEqual({
      password: 'Use at least 8 characters',
      confirm: 'Passwords do not match',
    });
  });
});
