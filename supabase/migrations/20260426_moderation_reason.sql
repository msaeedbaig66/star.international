-- ============================================================================
-- Migration: 20260426_moderation_reason.sql
-- Description: Adds moderation_reason to track why content was flagged or auto-approved.
-- ============================================================================

-- Add moderation_reason to core content tables
ALTER TABLE listings ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
ALTER TABLE communities ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

-- Update existing data to have a default reason for approved items
UPDATE listings SET moderation_reason = 'Previously approved' WHERE moderation = 'approved' AND moderation_reason IS NULL;
UPDATE blogs SET moderation_reason = 'Previously approved' WHERE moderation = 'approved' AND moderation_reason IS NULL;
UPDATE communities SET moderation_reason = 'Previously approved' WHERE moderation = 'approved' AND moderation_reason IS NULL;
UPDATE posts SET moderation_reason = 'Previously approved' WHERE moderation = 'approved' AND moderation_reason IS NULL;
UPDATE comments SET moderation_reason = 'Previously approved' WHERE moderation = 'approved' AND moderation_reason IS NULL;
