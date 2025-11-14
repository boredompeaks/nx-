import { ProfilesService } from '../src/profiles/service';
class FakeProfilesAdapter {
    constructor() {
        this.store = new Map();
        this.store.set('u1', { id: 'u1', username: 'alice' });
    }
    async getById(id) { return this.store.get(id) ?? null; }
    async update(id, patch) {
        const cur = this.store.get(id);
        if (!cur)
            throw new Error('not found');
        const next = { ...cur, ...patch };
        this.store.set(id, next);
        return next;
    }
}
describe('ProfilesService positive-path', () => {
    it('reads and updates profile', async () => {
        const svc = new ProfilesService(new FakeProfilesAdapter());
        const p = await svc.getProfile('u1');
        expect(p?.username).toBe('alice');
        const u = await svc.updateProfile('u1', { display_name: 'Alice' });
        expect(u.display_name).toBe('Alice');
    });
    it('rejects invalid username', async () => {
        const svc = new ProfilesService(new FakeProfilesAdapter());
        await expect(svc.updateProfile('u1', { username: '' })).rejects.toThrow();
    });
});
