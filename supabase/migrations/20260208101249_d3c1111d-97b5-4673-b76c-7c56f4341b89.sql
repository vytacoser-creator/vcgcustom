
-- Players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  total_score INTEGER NOT NULL DEFAULT 0,
  total_wins INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Matches table
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mode TEXT NOT NULL,
  team1_players TEXT[] NOT NULL,
  team2_players TEXT[] NOT NULL,
  winning_team INTEGER NOT NULL CHECK (winning_team IN (1, 2)),
  screenshot_url TEXT,
  moderator_name TEXT NOT NULL DEFAULT 'Unknown',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Score logs table
CREATE TABLE public.score_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_logs ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Anyone can view players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Anyone can view matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Anyone can view score_logs" ON public.score_logs FOR SELECT USING (true);

-- Public insert/update/delete policies (mod auth handled at app level via admin password)
CREATE POLICY "Allow insert players" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update players" ON public.players FOR UPDATE USING (true);
CREATE POLICY "Allow delete players" ON public.players FOR DELETE USING (true);

CREATE POLICY "Allow insert matches" ON public.matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update matches" ON public.matches FOR UPDATE USING (true);
CREATE POLICY "Allow delete matches" ON public.matches FOR DELETE USING (true);

CREATE POLICY "Allow insert score_logs" ON public.score_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update score_logs" ON public.score_logs FOR UPDATE USING (true);
CREATE POLICY "Allow delete score_logs" ON public.score_logs FOR DELETE USING (true);

-- Enable realtime for leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;

-- Updated_at trigger for players
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_players_updated_at
BEFORE UPDATE ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
