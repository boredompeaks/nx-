CREATE TABLE IF NOT EXISTS public.reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamp DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS reactions_message_id_idx ON public.reactions (message_id);
CREATE INDEX IF NOT EXISTS reactions_user_id_idx ON public.reactions (user_id);

CREATE TABLE IF NOT EXISTS public.read_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.chats(id) ON DELETE CASCADE,
  read_at timestamp DEFAULT now(),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS read_receipts_conversation_id_idx ON public.read_receipts (conversation_id);
CREATE INDEX IF NOT EXISTS read_receipts_user_id_idx ON public.read_receipts (user_id);

CREATE TABLE IF NOT EXISTS public.typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_typing boolean DEFAULT true,
  updated_at timestamp DEFAULT now(),
  created_at timestamp DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.message_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_delivered boolean DEFAULT false,
  is_read boolean DEFAULT false,
  delivered_at timestamp,
  read_at timestamp,
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS message_status_message_id_idx ON public.message_status (message_id);
CREATE INDEX IF NOT EXISTS message_status_user_id_idx ON public.message_status (user_id);

CREATE TABLE IF NOT EXISTS public.hidden_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  hidden_by_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  hidden_at timestamp DEFAULT now(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.chats(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hidden_messages_user_id_idx ON public.hidden_messages (user_id);
CREATE INDEX IF NOT EXISTS hidden_messages_conversation_id_idx ON public.hidden_messages (conversation_id);
