CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY,
  chat_id uuid REFERENCES public.chats(id),
  sender_id uuid REFERENCES public.profiles(id),
  content text NOT NULL,
  content_type text DEFAULT 'text',
  media_url text,
  is_encrypted boolean DEFAULT true,
  is_one_time_view boolean DEFAULT false,
  viewed_at timestamp,
  disappear_after integer,
  disappears_at timestamp,
  reply_to_id uuid REFERENCES public.messages(id),
  read_at timestamp,
  delivered_at timestamp,
  created_at timestamp DEFAULT now()
);

