import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Award, Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface Player {
  id: string;
  name: string;
  total_score: number;
  total_wins: number;
}

const LeaderboardTable = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchPlayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("total_score", { ascending: false });

    if (!error && data) {
      setPlayers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlayers();

    const channel = supabase
      .channel("players-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => {
        fetchPlayers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-accent animate-pulse-glow" />;
    if (index === 1) return <Medal className="h-5 w-5 text-muted-foreground" style={{ color: "hsl(0, 0%, 75%)" }} />;
    if (index === 2) return <Award className="h-5 w-5" style={{ color: "hsl(25, 70%, 50%)" }} />;
    return <span className="text-muted-foreground font-mono text-sm w-5 text-center">{index + 1}</span>;
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return "border-accent/30 bg-accent/5";
    if (index === 1) return "border-muted-foreground/20 bg-muted/30";
    if (index === 2) return "border-muted-foreground/10 bg-muted/20";
    return "border-border";
  };

  const exportCSV = () => {
    const csv = [
      "Rank,Player,Score,Wins",
      ...filteredPlayers.map((p, i) => `${i + 1},${p.name},${p.total_score},${p.total_wins}`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vcg-leaderboard.csv";
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm người chơi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All-time</SelectItem>
            <SelectItem value="month">Tháng này</SelectItem>
            <SelectItem value="quarter">Quý này</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={exportCSV} title="Export CSV">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-secondary animate-pulse" />
          ))}
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Chưa có dữ liệu xếp hạng</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition-all hover:bg-secondary/50 animate-slide-up ${getRankStyle(index)}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-center w-8">
                {getRankIcon(index)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate ${index < 3 ? "text-foreground" : "text-secondary-foreground"}`}>
                  {player.name}
                </p>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-right">
                  <p className="text-primary font-gaming font-bold text-lg">{player.total_score}</p>
                  <p className="text-muted-foreground text-xs">điểm</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{player.total_wins}</p>
                  <p className="text-muted-foreground text-xs">thắng</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaderboardTable;
