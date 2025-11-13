# Migration Audit Trail

## 0001_profiles
- Create `public.profiles` table with fields: `id`, `username` (UNIQUE, NOT NULL), `display_name`, `avatar_url`, `status` (DEFAULT 'offline'), `bio`, `public_key`, `last_seen`, timestamps.
- Create `public.handle_new_user()` trigger function to auto-create a profile upon `auth.users` insert.
- Attach trigger `on_auth_user_created` to `auth.users`.

Instructions:
- Apply in Supabase SQL editor or migration runner before deploying auth-dependent features.
- Ensure RLS policies are added per project requirements (not included here).

