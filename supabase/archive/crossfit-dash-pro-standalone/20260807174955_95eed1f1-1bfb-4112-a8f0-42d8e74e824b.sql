ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'clase',
  ADD COLUMN IF NOT EXISTS topic text;