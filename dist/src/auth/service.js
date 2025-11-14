export class AuthService {
    constructor(adapter) {
        this.session = null;
        this.adapter = adapter;
    }
    async register(email, password) {
        if (!email || !password || password.length < 8)
            throw new Error('Invalid credentials');
        const user = await this.adapter.signUpWithEmail(email, password);
        return user;
    }
    async login(email, password) {
        if (!email || !password || password.length < 8)
            throw new Error('Invalid credentials');
        const session = await this.adapter.signInWithPassword(email, password);
        this.session = session;
        return session;
    }
    async getSession() {
        const s = await this.adapter.getSession();
        this.session = s;
        return s;
    }
    async logout() {
        await this.adapter.signOut();
        this.session = null;
    }
}
