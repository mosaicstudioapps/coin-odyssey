// src/services/auth.ts
import { supabase } from './supabase';
import { Logger } from './logger';

export class AuthService {
  static async signIn(email: string, password: string) {
    Logger.info('AuthService: Attempting sign in');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    Logger.info('AuthService: Sign in result', {
      hasUser: !!data.user,
      hasSession: !!data.session,
      error: error?.message
    });
    
    return { data, error };
  }

  static async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    return { data, error };
  }

  static async signOut() {
    Logger.info('AuthService: Signing out');
    const { error } = await supabase.auth.signOut();
    if (error) {
      Logger.error('AuthService: Sign out error', error);
    }
    return { error };
  }

  static async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  /**
   * Deep link the reset email sends the user back to. Must be listed under
   * Auth → URL Configuration → Redirect URLs in the Supabase dashboard.
   */
  static readonly PASSWORD_RESET_REDIRECT = 'coin-odyssey://reset-password';

  static async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: AuthService.PASSWORD_RESET_REDIRECT,
    });
    return { data, error };
  }

  static isPasswordRecoveryUrl(url: string): boolean {
    return url.startsWith('coin-odyssey://') && url.includes('reset-password');
  }

  /**
   * Completes the recovery deep link: Supabase's verify endpoint redirects
   * here with session tokens (or an error) in the URL fragment. On success
   * the recovery session is installed and the caller should prompt for a
   * new password.
   */
  static async completePasswordRecovery(
    url: string
  ): Promise<{ ok: boolean; message?: string }> {
    const fragment = url.split('#')[1] ?? '';
    const params: Record<string, string> = {};
    for (const pair of fragment.split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      if (eq === -1) continue;
      const key = decodeURIComponent(pair.slice(0, eq));
      params[key] = decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, ' '));
    }

    if (params.error || params.error_description) {
      Logger.warn('Password recovery link returned an error', {
        error: params.error,
        code: params.error_code,
      });
      return {
        ok: false,
        message: params.error_description || 'This reset link is invalid or has expired.',
      };
    }

    const { access_token, refresh_token } = params;
    if (!access_token || !refresh_token) {
      return { ok: false, message: 'This reset link is invalid or has expired.' };
    }

    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      Logger.error('Password recovery setSession failed', error);
      return { ok: false, message: error.message };
    }
    return { ok: true };
  }

  static async updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({ password });
    return { data, error };
  }
}