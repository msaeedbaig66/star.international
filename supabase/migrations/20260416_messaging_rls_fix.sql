-- Migration: messaging_rls_fix.sql
-- Description: Fixes RLS policies for message_threads and thread_participants to allow user interaction.

-- Enable RLS if not already
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;

-- Message Threads Policies
DROP POLICY IF EXISTS "threads_read_participant" ON message_threads;
CREATE POLICY "threads_read_participant" ON message_threads
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM thread_participants WHERE thread_id = id AND user_id = auth.uid())
    );

DROP POLICY IF EXISTS "threads_insert_authenticated" ON message_threads;
CREATE POLICY "threads_insert_authenticated" ON message_threads
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Thread Participants Policies
DROP POLICY IF EXISTS "participants_read_own" ON thread_participants;
CREATE POLICY "participants_read_own" ON thread_participants
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM thread_participants AS others 
            WHERE others.thread_id = thread_participants.thread_id 
            AND others.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "participants_insert_authenticated" ON thread_participants;
CREATE POLICY "participants_insert_authenticated" ON thread_participants
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure messages table has correct policies
DROP POLICY IF EXISTS "messages_read_participant" ON messages;
CREATE POLICY "messages_read_participant" ON messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM thread_participants WHERE thread_id = messages.thread_id AND user_id = auth.uid())
    );

DROP POLICY IF EXISTS "messages_insert_own" ON messages;
CREATE POLICY "messages_insert_own" ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);
