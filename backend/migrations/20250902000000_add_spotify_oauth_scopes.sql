-- Add OAuth scopes support for Spotify integration
-- This migration extends the user_credentials table to support OAuth scopes

-- Add token_scope column to store OAuth scopes granted by the user
ALTER TABLE user_credentials ADD COLUMN token_scope TEXT;

-- Update the index to include the new column for efficient lookups
-- The existing index idx_user_credentials_user_service is already optimal for our needs

-- Add comment for future reference
-- token_scope will store space-separated OAuth scopes like:
-- "playlist-read-private playlist-modify-private playlist-modify-public"