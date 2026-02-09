import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Trash2, Pencil, Gamepad2, Clock, User } from "lucide-react";

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

const MODES = ["ARAM Hỗn Loạn", "ARAM Thường", "ARURF"];

const MatchManagement = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editMode, setEditMode] = useState("");
  const [editTeam1, setEditTeam1] = useState<string[]>([]);
  const [editTeam2, setEditTeam2] = useState<string[]>([]);
  const [editWinningTeam, setEditWinningTeam] = useState("");

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

  useEffect(() => {
    fetchMatches();
  }, []);

  const openEditDialog = (match: Match) => {
    setEditingMatch(match);
    setEditMode(match.mode);
    setEditTeam1([...match.team1_players]);
    setEditTeam2([...match.team2_players]);
    setEditWinningTeam(match.winning_team.toString());
  };

  const handleDelete = async (match: Match) => {
    if (!confirm(`Bạn có chắc muốn xoá trận này? Điểm của người thắng sẽ bị trừ.`)) return;

    setDeleting(match.id);
    try {
      const winners = match.winning_team === 1 ? match.team1_players : match.team2_players;
      const allPlayers = [...match.team1_players, ...match.team2_players];

      // Decrease total_matches for ALL players in the match
      for (const name of allPlayers) {
        const { data: player } = await supabase
          .from("players")
          .select("id, total_score, total_matches")
          .eq("name", name)
          .maybeSingle();

        if (player) {
          const isWinner = winners.includes(name);
          await supabase
            .from("players")
            .update({
              total_score: Math.max(0, player.total_score - (isWinner ? 1 : 0)),
              total_matches: Math.max(0, player.total_matches - 1),
            })
            .eq("id", player.id);
        }
      }

      // Delete score logs for this match
      await supabase.from("score_logs").delete().eq("match_id", match.id);

      // Delete the match
      const { error } = await supabase.from("matches").delete().eq("id", match.id);
      if (error) throw error;

      toast.success("Đã xoá trận đấu và cập nhật điểm!");
      fetchMatches();
    } catch (e: any) {
      toast.error("Lỗi: " + e.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMatch) return;

    const allPlayers = [...editTeam1, ...editTeam2].map((p) => p.trim().toLowerCase());
    const filled = allPlayers.filter(Boolean);
    if (new Set(filled).size !== filled.length) {
      toast.error("Có tên bị trùng!");
      return;
    }
    if (!editTeam1.every((p) => p.trim()) || !editTeam2.every((p) => p.trim())) {
      toast.error("Vui lòng điền đầy đủ tên!");
      return;
    }

    setSaving(true);
    try {
      const oldWinners = editingMatch.winning_team === 1 
        ? editingMatch.team1_players 
        : editingMatch.team2_players;
      const oldAllPlayers = [...editingMatch.team1_players, ...editingMatch.team2_players];
      const newWinners = parseInt(editWinningTeam) === 1 
        ? editTeam1.map(p => p.trim()) 
        : editTeam2.map(p => p.trim());

      // Reverse old scores and matches for ALL old players
      for (const name of oldAllPlayers) {
        const { data: player } = await supabase
          .from("players")
          .select("id, total_score, total_matches")
          .eq("name", name)
          .maybeSingle();

        if (player) {
          const wasWinner = oldWinners.includes(name);
          await supabase
            .from("players")
            .update({
              total_score: Math.max(0, player.total_score - (wasWinner ? 1 : 0)),
              total_matches: Math.max(0, player.total_matches - 1),
            })
            .eq("id", player.id);
        }
      }

      // Delete old score logs
      await supabase.from("score_logs").delete().eq("match_id", editingMatch.id);

      // Add new scores for ALL new players
      const team1Names = editTeam1.map(p => p.trim());
      const team2Names = editTeam2.map(p => p.trim());
      const allNames = [...new Set([...team1Names, ...team2Names])];

      for (const name of allNames) {
        const isWinner = newWinners.includes(name);
        const { data: existing } = await supabase
          .from("players")
          .select("id, total_score, total_matches")
          .eq("name", name)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("players")
            .update({
              total_score: existing.total_score + (isWinner ? 1 : 0),
              total_matches: existing.total_matches + 1,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("players").insert({
            name,
            total_score: isWinner ? 1 : 0,
            total_matches: 1,
          });
        }

        if (isWinner) {
          await supabase.from("score_logs").insert({
            player_name: name,
            match_id: editingMatch.id,
            points: 1,
          });
        }
      }

      // Update match
      const { error } = await supabase
        .from("matches")
        .update({
          mode: editMode,
          team1_players: team1Names,
          team2_players: team2Names,
          winning_team: parseInt(editWinningTeam),
        })
        .eq("id", editingMatch.id);

      if (error) throw error;

      toast.success("Đã cập nhật trận đấu!");
      setEditingMatch(null);
      fetchMatches();
    } catch (e: any) {
      toast.error("Lỗi: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const modeColors: Record<string, string> = {
    "ARAM Hỗn Loạn": "bg-primary/20 text-primary",
    "ARAM Thường": "bg-accent/20 text-accent",
    "ARURF": "bg-destructive/20 text-destructive",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <h3 className="font-gaming text-sm text-muted-foreground">📋 Quản lý trận đấu ({matches.length})</h3>
        
        {matches.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">Chưa có trận đấu</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {matches.map((match) => (
              <div key={match.id} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Gamepad2 className="h-3 w-3 text-muted-foreground" />
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${modeColors[match.mode] || "bg-secondary"}`}>
                      {match.mode}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Team {match.winning_team} thắng
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(match.created_at).toLocaleDateString("vi-VN")}
                    <User className="h-3 w-3 ml-1" />
                    {match.moderator_name}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(match)}
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(match)}
                    disabled={deleting === match.id}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    {deleting === match.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingMatch} onOpenChange={(open) => !open && setEditingMatch(null)}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-gaming text-primary">Sửa trận đấu</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Mode</Label>
              <Select value={editMode} onValueChange={setEditMode}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(["team1", "team2"] as const).map((team, teamIdx) => (
                <div key={team} className="space-y-1">
                  <Label className="text-xs">Team {teamIdx + 1}</Label>
                  <div className="space-y-1">
                    {(team === "team1" ? editTeam1 : editTeam2).map((player, i) => (
                      <Input
                        key={i}
                        value={player}
                        onChange={(e) => {
                          if (team === "team1") {
                            const updated = [...editTeam1];
                            updated[i] = e.target.value;
                            setEditTeam1(updated);
                          } else {
                            const updated = [...editTeam2];
                            updated[i] = e.target.value;
                            setEditTeam2(updated);
                          }
                        }}
                        className="bg-secondary border-border h-8 text-sm"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Team Thắng</Label>
              <Select value={editWinningTeam} onValueChange={setEditWinningTeam}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Team 1</SelectItem>
                  <SelectItem value="2">Team 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditingMatch(null)}
                className="flex-1"
              >
                Huỷ
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 gradient-gaming text-primary-foreground font-gaming"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Lưu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MatchManagement;
