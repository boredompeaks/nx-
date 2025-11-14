import { AuthService } from '../src/auth/service';
class FakeAuthAdapter {
    constructor() {
        this.session = null;
    }
    async signUpWithEmail(email, password) {
        return { id: 'u1', email };
    }
    async signInWithPassword(email, password) {
        this.session = { accessToken: 'tok', user: { id: 'u1', email } };
        return this.session;
    }
    async getSession() { return this.session; }
    async signOut() { this.session = null; }
}
describe('AuthService positive-path', () => {
    it('registers user and logs in, manages session', async () => {
        const svc = new AuthService(new FakeAuthAdapter());
        const u = await svc.register('a@example.com', 'password123');
        expect(u.email).toBe('a@example.com');
        const s = await svc.login('a@example.com', 'password123');
        expect(s.user.email).toBe('a@example.com');
        const s2 = await svc.getSession();
        expect(s2?.accessToken).toBe('tok');
        await svc.logout();
        expect(await svc.getSession()).toBeNull();
    });
    it('rejects invalid credentials', async () => {
        const svc = new AuthService(new FakeAuthAdapter());
        await expect(svc.register('a@example.com', 'short')).rejects.toThrow();
        await expect(svc.login('a@example.com', 'short')).rejects.toThrow();
    });
});
