export type AuthUser = { id: string; email: string };
export type AuthSession = { accessToken: string; user: AuthUser };
export interface AuthAdapter {
  signUpWithEmail(email: string, password: string): Promise<AuthUser>;
  signInWithPassword(email: string, password: string): Promise<AuthSession>;
  getSession(): Promise<AuthSession | null>;
  signOut(): Promise<void>;
}

