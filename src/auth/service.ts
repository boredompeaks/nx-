import { AuthAdapter, AuthSession, AuthUser } from './types';

export class AuthService {
  private adapter: AuthAdapter;
  private session: AuthSession | null = null;
  constructor(adapter: AuthAdapter) { this.adapter = adapter; }
  async register(email: string, password: string): Promise<AuthUser> {
    if (!email || !password || password.length < 8) throw new Error('Invalid credentials');
    const user = await this.adapter.signUpWithEmail(email, password);
    return user;
  }
  async login(email: string, password: string): Promise<AuthSession> {
    if (!email || !password || password.length < 8) throw new Error('Invalid credentials');
    const session = await this.adapter.signInWithPassword(email, password);
    this.session = session;
    return session;
  }
  async getSession(): Promise<AuthSession | null> {
    const s = await this.adapter.getSession();
    this.session = s;
    return s;
  }
  async logout(): Promise<void> {
    await this.adapter.signOut();
    this.session = null;
  }
}

