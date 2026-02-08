import { useState } from "react";
import AdminGate from "@/components/AdminGate";
import MatchForm from "@/components/MatchForm";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Admin = () => {
  const [modName, setModName] = useState("");
  const [resetting, setResetting] = useState(false);

  const handleResetScores = async () => {
    if (!confirm("Bạn có chắc muốn reset toàn bộ điểm về 0?")) return;
    setResetting(true);
    try {
      const { error } = await supabase
        .from("players")
        .update({ total_score: 0, total_wins: 0 })
        .gte("total_score", 0);

      if (error) throw error;
      toast.success("Đã reset điểm thành công!");
    } catch (e: any) {
      toast.error("Lỗi: " + e.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <AdminGate>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Shield className="h-7 w-7 text-primary" />
            <h1 className="font-gaming text-3xl font-bold text-glow text-primary">
              MOD PANEL
            </h1>
          </div>
          <p className="text-muted-foreground">Nhập kết quả trận đấu</p>
        </div>

        <div className="card-gaming p-6 space-y-6">
          {/* Mod name input */}
          <div className="space-y-2">
            <Label className="font-gaming text-sm">📝 Tên Moderator</Label>
            <Input
              value={modName}
              onChange={(e) => setModName(e.target.value)}
              placeholder="Nhập tên mod..."
              className="bg-secondary border-border"
            />
          </div>

          {modName.trim() ? (
            <MatchForm moderatorName={modName.trim()} />
          ) : (
            <p className="text-center text-muted-foreground text-sm py-4">
              Vui lòng nhập tên moderator để bắt đầu
            </p>
          )}

          <div className="border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={handleResetScores}
              disabled={resetting}
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              RESET ĐIỂM THÁNG
            </Button>
          </div>
        </div>
      </div>
    </AdminGate>
  );
};

export default Admin;
