export type Profile = {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  status?: string;
  bio?: string;
  public_key?: string;
  last_seen?: string;
};

export interface ProfilesAdapter {
  getById(id: string): Promise<Profile | null>;
  update(id: string, patch: Partial<Profile>): Promise<Profile>;
}

