import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, ClipboardPaste, Shuffle } from "lucide-react";
import PlayerInput from "@/components/PlayerInput";

const MODES = ["ARAM Hỗn Loạn", "ARAM Thường", "ARURF"];
const STORAGE_KEY = "vcg-match-form";

interface FormData {
  mode: string;
  team1: string[];
  team2: string[];
  winningTeam: string;
}

const getStoredData = (): FormData => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { mode: "", team1: ["", "", "", "", ""], team2: ["", "", "", "", ""], winningTeam: "" };
};

const MatchForm = ({ moderatorName }: { moderatorName: string }) => {
  const [mode, setMode] = useState(() => getStoredData().mode);
  const [team1, setTeam1] = useState<string[]>(() => getStoredData().team1);
  const [team2, setTeam2] = useState<string[]>(() => getStoredData().team2);
  const [winningTeam, setWinningTeam] = useState<string>(() => getStoredData().winningTeam);
  const [loading, setLoading] = useState(false);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [bulkPlayers, setBulkPlayers] = useState("");

  // Fetch all player names for autocomplete
  useEffect(() => {
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from("players")
        .select("name")
        .order("total_score", { ascending: false });
      if (data) {
        setPlayerNames(data.map(p => p.name));
      }
    };
    fetchPlayers();
  }, []);

  // Random sort function - shuffle array using Fisher-Yates
  const randomSort = () => {
    // Parse names from bulk input (split by space, newline, or comma)
    const names = bulkPlayers
      .split(/[\s,\n]+/)
      .map(n => n.trim())
      .filter(Boolean);
    
    if (names.length < 2) {
      toast.error("Cần ít nhất 2 tên để random!");
      return;
    }
    
    if (names.length > 10) {
      toast.error("Tối đa 10 người chơi!");
      return;
    }
    
    // Fisher-Yates shuffle
    const shuffled = [...names];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Split into two teams
    const half = Math.ceil(shuffled.length / 2);
    const t1 = shuffled.slice(0, half);
    const t2 = shuffled.slice(half);
    
    // Fill remaining slots with empty strings
    while (t1.length < 5) t1.push("");
    while (t2.length < 5) t2.push("");
    
    setTeam1(t1.slice(0, 5));
    setTeam2(t2.slice(0, 5));
    
    toast.success(`Đã random ${names.length} người vào 2 team!`);
  };

  // Save to sessionStorage whenever form changes
  useEffect(() => {
    const data: FormData = { mode, team1, team2, winningTeam };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [mode, team1, team2, winningTeam]);

  const clearForm = () => {
    setMode("");
    setTeam1(["", "", "", "", ""]);
    setTeam2(["", "", "", "", ""]);
    setWinningTeam("");
    sessionStorage.removeItem(STORAGE_KEY);
  };

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

  const pasteTeam = async (team: "team1" | "team2") => {
    try {
      const text = await navigator.clipboard.readText();
      const players = text.split(/[\n,]/).map(p => p.trim()).filter(Boolean).slice(0, 5);
      
      if (players.length === 0) {
        toast.error("Clipboard trống hoặc không có tên!");
        return;
      }
      
      // Fill remaining slots with empty strings
      while (players.length < 5) {
        players.push("");
      }
      
      if (team === "team1") {
        setTeam1(players);
      } else {
        setTeam2(players);
      }
      
      toast.success(`Đã paste ${players.filter(Boolean).length} người chơi!`);
    } catch {
      toast.error("Không thể đọc clipboard! Hãy cho phép truy cập.");
    }
  };

  const pasteAll = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const data = JSON.parse(text);
      
      if (data.mode && data.team1 && data.team2) {
        setMode(data.mode);
        
        // Ensure team arrays have 5 elements
        const t1 = [...data.team1];
        const t2 = [...data.team2];
        while (t1.length < 5) t1.push("");
        while (t2.length < 5) t2.push("");
        
        setTeam1(t1.slice(0, 5));
        setTeam2(t2.slice(0, 5));
        
        if (data.winningTeam) {
          setWinningTeam(data.winningTeam);
        }
        
        toast.success("Đã paste toàn bộ trận đấu!");
      } else {
        toast.error("Dữ liệu không hợp lệ!");
      }
    } catch {
      toast.error("Không thể đọc clipboard hoặc dữ liệu không hợp lệ!");
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
      clearForm();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Paste All */}
      <Button
        type="button"
        variant="outline"
        onClick={pasteAll}
        className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/10"
      >
        <ClipboardPaste className="h-4 w-4 mr-2" />
        Paste All (từ Copy All ở lịch sử trận)
      </Button>

      {/* Random Team Generator */}
      <div className="space-y-2 p-4 bg-secondary/50 rounded-lg border border-border">
        <Label className="font-gaming text-sm">🎲 Random Team Generator</Label>
        <p className="text-xs text-muted-foreground">Paste 10 tên (cách nhau bởi khoảng trắng, xuống dòng hoặc dấu phẩy)</p>
        <Textarea
          value={bulkPlayers}
          onChange={(e) => setBulkPlayers(e.target.value)}
          placeholder="Ví dụ: Player1 Player2 Player3 ..."
          className="bg-background border-border min-h-[80px]"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={randomSort}
          className="w-full"
        >
          <Shuffle className="h-4 w-4 mr-2" />
          Random Sort & Fill Teams
        </Button>
      </div>

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
            <div className="flex items-center justify-between">
              <Label className="font-gaming text-sm">
                👥 Team {teamIdx + 1}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => pasteTeam(team)}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
              >
                <ClipboardPaste className="h-3 w-3 mr-1" />
                Paste
              </Button>
            </div>
            <div className="space-y-2">
              {(team === "team1" ? team1 : team2).map((player, i) => (
                <PlayerInput
                  key={i}
                  value={player}
                  onChange={(value) => updatePlayer(team, i, value)}
                  placeholder={`Người chơi ${i + 1}`}
                  suggestions={playerNames}
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
