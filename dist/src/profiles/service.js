export class ProfilesService {
    constructor(adapter) { this.adapter = adapter; }
    async getProfile(id) {
        return this.adapter.getById(id);
    }
    async updateProfile(id, patch) {
        if (patch.username !== undefined && patch.username.trim().length === 0)
            throw new Error('Invalid username');
        return this.adapter.update(id, patch);
    }
}
