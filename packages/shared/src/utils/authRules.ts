// Sign-up and password rules, shared so the mobile and web forms accept and
// reject the same things with the same words. Supabase enforces its own
// minimum server-side; these catch mistakes before the round trip.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Supabase's own minimum; sign-up keeps it so existing accounts stay valid. */
export const SIGN_UP_MIN_PASSWORD = 6;
/** A reset asks for a little more than sign-up did. */
export const NEW_PASSWORD_MIN = 8;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export interface SignUpErrors {
  email?: string;
  password?: string;
  confirm?: string;
}

export function validateSignUp(email: string, password: string, confirm: string): SignUpErrors {
  const errors: SignUpErrors = {};
  if (!isValidEmail(email)) errors.email = 'Enter a valid email';
  if (password.length < SIGN_UP_MIN_PASSWORD) errors.password = `At least ${SIGN_UP_MIN_PASSWORD} characters`;
  if (password !== confirm) errors.confirm = "Doesn't match";
  return errors;
}

export interface NewPasswordErrors {
  password?: string;
  confirm?: string;
}

export function validateNewPassword(password: string, confirm: string): NewPasswordErrors {
  const errors: NewPasswordErrors = {};
  if (password.length < NEW_PASSWORD_MIN) errors.password = `Use at least ${NEW_PASSWORD_MIN} characters`;
  if (confirm !== password) errors.confirm = 'Passwords do not match';
  return errors;
}
