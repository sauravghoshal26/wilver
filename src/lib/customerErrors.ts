type ErrorLike = { message?: string } | null | undefined;

export function customerDataError(error: ErrorLike, fallback = 'Something went wrong. Please try again.') {
  const message = error?.message?.toLowerCase() ?? '';
  if (/jwt|session|refresh token|not authenticated/.test(message)) return 'Your session expired. Please log in again.';
  if (/fetch|network|offline|timeout|connection/.test(message)) return 'We couldn’t connect. Check your internet connection and try again.';
  if (/rate limit|too many requests/.test(message)) return 'Too many attempts. Please wait a moment and try again.';
  if (/duplicate|unique/.test(message) && /handle|profile/.test(message)) return 'That handle is already taken. Please choose another.';
  if (/row-level security|permission denied|not authorized|forbidden/.test(message)) return 'You don’t have permission to do that.';
  return fallback;
}

export function customerAuthError(error: ErrorLike, fallback = 'We couldn’t sign you in. Please try again.') {
  const message = error?.message?.toLowerCase() ?? '';
  if (/invalid login credentials|invalid credentials/.test(message)) return 'That email or password is incorrect.';
  if (/email not confirmed/.test(message)) return 'Confirm your email first, then log in.';
  if (/already registered|already exists/.test(message)) return 'An account already exists for this email. Try logging in instead.';
  if (/password/.test(message) && /weak|characters|length/.test(message)) return 'Choose a stronger password with at least 10 characters.';
  if (/expired|invalid.*token|invalid.*link/.test(message)) return 'This secure link has expired. Please request a new one.';
  return customerDataError(error, fallback);
}
