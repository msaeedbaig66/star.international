-- Preserve chat history when accounts are deleted.
-- Auth/profile records are still removed, but historical messages remain.

BEGIN;

ALTER TABLE public.messages
  ALTER COLUMN sender_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'messages_sender_id_fkey'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      DROP CONSTRAINT messages_sender_id_fkey;
  END IF;
END $$;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_fkey
  FOREIGN KEY (sender_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

COMMIT;
