import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

const MODES = ["ARAM Hỗn Loạn", "ARAM Thường", "ARURF"];

const MatchForm = ({ moderatorName }: { moderatorName: string }) => {
  const [mode, setMode] = useState("");
  const [team1, setTeam1] = useState<string[]>(["", "", "", "", ""]);
  const [team2, setTeam2] = useState<string[]>(["", "", "", "", ""]);
  const [winningTeam, setWinningTeam] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const updatePlayer = (team: "team1" | "team2", index: number, value: string) => {
    if (team === "team1") {
      const updated = [...team1];
      updated[index] = value;
      setTeam1(updated);
    } else {
      const updated = [...team2];
      updated[index] = value;
      setTeam2(updated);
    }
  };

  const allPlayers = [...team1, ...team2].map((p) => p.trim().toLowerCase());

  const hasDuplicates = () => {
    const filled = allPlayers.filter(Boolean);
    return new Set(filled).size !== filled.length;
  };

  const isValid = () => {
    return (
      mode &&
      winningTeam &&
      team1.every((p) => p.trim()) &&
      team2.every((p) => p.trim()) &&
      !hasDuplicates()
    );
  };

  const handleSubmit = async () => {
    if (!isValid()) {
      toast.error("Vui lòng điền đầy đủ thông tin và không trùng tên!");
      return;
    }

    setLoading(true);
    try {
      const team1Names = team1.map((p) => p.trim());
      const team2Names = team2.map((p) => p.trim());
      const winTeam = parseInt(winningTeam);
      const winners = winTeam === 1 ? team1Names : team2Names;

      // Insert match
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          mode,
          team1_players: team1Names,
          team2_players: team2Names,
          winning_team: winTeam,
          moderator_name: moderatorName,
        })
        .select()
        .single();

      if (matchError) throw matchError;

      // Upsert all players and update scores
      const allNames = [...new Set([...team1Names, ...team2Names])];
      for (const name of allNames) {
        const isWinner = winners.includes(name);

        // Check if player exists
        const { data: existing } = await supabase
          .from("players")
          .select("id, total_score, total_wins")
          .eq("name", name)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("players")
            .update({
              total_score: existing.total_score + (isWinner ? 1 : 0),
              total_wins: existing.total_wins + (isWinner ? 1 : 0),
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("players").insert({
            name,
            total_score: isWinner ? 1 : 0,
            total_wins: isWinner ? 1 : 0,
          });
        }

        // Log score
        if (isWinner) {
          await supabase.from("score_logs").insert({
            player_name: name,
            match_id: match.id,
            points: 1,
          });
        }
      }

      toast.success("Trận đấu đã được ghi nhận!");
      setMode("");
      setTeam1(["", "", "", "", ""]);
      setTeam2(["", "", "", "", ""]);
      setWinningTeam("");
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode */}
      <div className="space-y-2">
        <Label className="font-gaming text-sm">🎮 Mode Game</Label>
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue placeholder="Chọn mode..." />
          </SelectTrigger>
          <SelectContent>
            {MODES.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(["team1", "team2"] as const).map((team, teamIdx) => (
          <div key={team} className="space-y-2">
            <Label className="font-gaming text-sm">
              👥 Team {teamIdx + 1}
            </Label>
            <div className="space-y-2">
              {(team === "team1" ? team1 : team2).map((player, i) => (
                <Input
                  key={i}
                  value={player}
                  onChange={(e) => updatePlayer(team, i, e.target.value)}
                  placeholder={`Người chơi ${i + 1}`}
                  className="bg-secondary border-border"
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasDuplicates() && (
        <p className="text-destructive text-sm">⚠️ Có tên bị trùng!</p>
      )}

      {/* Winning Team */}
      <div className="space-y-2">
        <Label className="font-gaming text-sm">🏆 Team Thắng</Label>
        <Select value={winningTeam} onValueChange={setWinningTeam}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue placeholder="Chọn team thắng..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Team 1</SelectItem>
            <SelectItem value="2">Team 2</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!isValid() || loading}
        className="w-full gradient-gaming text-primary-foreground font-gaming font-bold tracking-wider"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
        GHI NHẬN TRẬN ĐẤU
      </Button>
    </div>
  );
};

export default MatchForm;
