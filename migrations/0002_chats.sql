CREATE TABLE IF NOT EXISTS public.chats (
  id uuid PRIMARY KEY,
  name text,
  is_group boolean DEFAULT false,
  avatar_url text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  last_message_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
  id uuid PRIMARY KEY,
  chat_id uuid REFERENCES public.chats(id),
  user_id uuid REFERENCES public.profiles(id),
  role text DEFAULT 'member',
  joined_at timestamp DEFAULT now(),
  last_read_at timestamp DEFAULT now(),
  muted boolean DEFAULT false,
  UNIQUE(chat_id, user_id)
);

