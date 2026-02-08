import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Award, Search, Download, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Check if user is admin
  const isAdmin = sessionStorage.getItem("vcg-admin") === "true";

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

  // Clear selection when players change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [players]);

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

  const deletePlayer = async (playerId: string, playerName: string) => {
    setDeletingId(playerId);
    try {
      const { error } = await supabase
        .from("players")
        .delete()
        .eq("id", playerId);

      if (error) {
        toast.error(`Lỗi xóa người chơi: ${error.message}`);
      } else {
        toast.success(`Đã xóa người chơi "${playerName}" thành công!`);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Lỗi không xác định";
      toast.error(`Lỗi: ${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Toggle selection for a single player
  const toggleSelection = (playerId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPlayers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPlayers.map((p) => p.id)));
    }
  };

  // Bulk delete selected players
  const deleteBulkPlayers = async () => {
    if (selectedIds.size === 0) return;

    setDeletingBulk(true);
    try {
      const idsToDelete = Array.from(selectedIds);
      const { error } = await supabase
        .from("players")
        .delete()
        .in("id", idsToDelete);

      if (error) {
        toast.error(`Lỗi xóa: ${error.message}`);
      } else {
        toast.success(`Đã xóa ${idsToDelete.length} người chơi thành công!`);
        setSelectedIds(new Set());
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Lỗi không xác định";
      toast.error(`Lỗi: ${errorMessage}`);
    } finally {
      setDeletingBulk(false);
      setBulkDeleteDialogOpen(false);
    }
  };

  const isAllSelected = filteredPlayers.length > 0 && selectedIds.size === filteredPlayers.length;
  const isSomeSelected = selectedIds.size > 0;

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

      {/* Bulk delete controls - only shown for admin when players are selected */}
      {isAdmin && isSomeSelected && (
        <div className="flex items-center justify-between bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2">
          <span className="text-sm text-destructive font-medium">
            Đã chọn {selectedIds.size} người chơi
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-muted-foreground hover:text-foreground"
            >
              Bỏ chọn
            </Button>
            <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa {selectedIds.size} người chơi
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận xóa hàng loạt</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn có chắc chắn muốn xóa <strong>{selectedIds.size} người chơi</strong> đã chọn khỏi bảng xếp hạng?
                    Hành động này không thể hoàn tác.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteBulkPlayers}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deletingBulk}
                  >
                    {deletingBulk ? "Đang xóa..." : `Xóa ${selectedIds.size} người chơi`}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

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
          {/* Select all checkbox - only for admin */}
          {isAdmin && filteredPlayers.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={toggleSelectAll}
                className="data-[state=checked]:bg-primary"
              />
              <span className="text-sm text-muted-foreground">
                {isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </span>
            </div>
          )}

          {filteredPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition-all hover:bg-secondary/50 animate-slide-up ${getRankStyle(index)} ${selectedIds.has(player.id) ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Checkbox for admin */}
              {isAdmin && (
                <Checkbox
                  checked={selectedIds.has(player.id)}
                  onCheckedChange={() => toggleSelection(player.id)}
                  className="data-[state=checked]:bg-primary"
                />
              )}

              <div className="flex items-center justify-center w-8">
                {getRankIcon(index)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate ${index < 3 ? "text-foreground" : "text-secondary-foreground"}`}>
                  {player.name}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-right">
                  <p className="text-primary font-gaming font-bold text-lg">{player.total_score}</p>
                  <p className="text-muted-foreground text-xs">điểm</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{player.total_wins}</p>
                  <p className="text-muted-foreground text-xs">thắng</p>
                </div>
                {/* Delete button - only for admin */}
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Xóa người chơi"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa người chơi</AlertDialogTitle>
                        <AlertDialogDescription>
                          Bạn có chắc chắn muốn xóa người chơi <strong>"{player.name}"</strong> khỏi bảng xếp hạng?
                          Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deletePlayer(player.id, player.name)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={deletingId === player.id}
                        >
                          {deletingId === player.id ? "Đang xóa..." : "Xóa"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaderboardTable;
