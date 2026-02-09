-- Migration: Rename total_wins to total_matches
-- This migration renames the column to better reflect its purpose:
-- counting total matches played (not just wins)

-- Step 1: Rename the column
ALTER TABLE public.players RENAME COLUMN total_wins TO total_matches;

-- Step 2: Add a comment to clarify the column purpose
COMMENT ON COLUMN public.players.total_matches IS 'Total number of matches played by the player (both wins and losses)';
