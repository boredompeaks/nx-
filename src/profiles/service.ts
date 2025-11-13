import { Profile, ProfilesAdapter } from './types';

export class ProfilesService {
  private adapter: ProfilesAdapter;
  constructor(adapter: ProfilesAdapter) { this.adapter = adapter; }
  async getProfile(id: string): Promise<Profile | null> {
    return this.adapter.getById(id);
  }
  async updateProfile(id: string, patch: Partial<Profile>): Promise<Profile> {
    if (patch.username !== undefined && patch.username.trim().length === 0) throw new Error('Invalid username');
    return this.adapter.update(id, patch);
  }
}
