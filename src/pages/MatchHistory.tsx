import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import MatchCard from "@/components/MatchCard";
import { History, Loader2 } from "lucide-react";

interface Match {
  id: string;
  mode: string;
  team1_players: string[];
  team2_players: string[];
  winning_team: number;
  screenshot_url: string | null;
  moderator_name: string;
  created_at: string;
}

const MatchHistory = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setMatches(data as Match[]);
      }
      setLoading(false);
    };

    fetchMatches();

    const channel = supabase
      .channel("matches-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        fetchMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-2">
          <History className="h-7 w-7 text-primary" />
          <h1 className="font-gaming text-3xl font-bold text-glow text-primary">
            LỊCH SỬ TRẬN ĐẤU
          </h1>
        </div>
        <p className="text-muted-foreground">Danh sách các trận đã diễn ra</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Chưa có trận đấu nào</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MatchHistory;
