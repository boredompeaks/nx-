CREATE TABLE IF NOT EXISTS public.webrtc_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  from_user text NOT NULL,
  to_user text NOT NULL,
  signal_type text NOT NULL CHECK (signal_type IN ('offer','answer','ice-candidate','renegotiate','bye')),
  signal_data jsonb NOT NULL,
  timestamp timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webrtc_signals_room_id_idx ON public.webrtc_signals (room_id);
CREATE INDEX IF NOT EXISTS webrtc_signals_to_user_room_id_idx ON public.webrtc_signals (to_user, room_id);

CREATE TABLE IF NOT EXISTS public.webrtc_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  user_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('joined','left')),
  last_heartbeat timestamp DEFAULT now(),
  UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS webrtc_presence_room_id_idx ON public.webrtc_presence (room_id);
CREATE INDEX IF NOT EXISTS webrtc_presence_user_id_idx ON public.webrtc_presence (user_id);
