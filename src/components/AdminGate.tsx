import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, User, LogOut } from "lucide-react";

// Password check - for basic protection
// RLS policies on Supabase still protect the database
const ADMIN_PASSWORD = "vcg2024admin";

interface AdminGateProps {
  children: React.ReactNode;
  onModNameChange?: (name: string) => void;
}

const AdminGate = ({ children, onModNameChange }: AdminGateProps) => {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem("vcg-admin") === "true"
  );
  const [modName, setModName] = useState(
    () => sessionStorage.getItem("vcg-mod-name") || ""
  );
  const [password, setPassword] = useState("");
  const [tempModName, setTempModName] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!tempModName.trim()) {
      setError("Vui lòng nhập tên moderator");
      return;
    }
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("vcg-admin", "true");
      sessionStorage.setItem("vcg-mod-name", tempModName.trim());
      setModName(tempModName.trim());
      setAuthenticated(true);
      setError("");
      onModNameChange?.(tempModName.trim());
    } else {
      setError("Sai mật khẩu!");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("vcg-admin");
    sessionStorage.removeItem("vcg-mod-name");
    setAuthenticated(false);
    setModName("");
    setPassword("");
    setTempModName("");
  };

  if (authenticated) {
    return (
      <div className="relative">
        {/* Logout button */}
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Đăng xuất
          </Button>
        </div>
        {/* Pass modName to children via context or render prop */}
        {typeof children === 'function' 
          ? (children as (modName: string) => React.ReactNode)(modName)
          : children
        }
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="card-gaming p-8 w-full max-w-sm space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full gradient-gaming p-4">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <div>
          <h2 className="font-gaming text-xl font-bold text-foreground">MOD ACCESS</h2>
          <p className="text-muted-foreground text-sm mt-1">Nhập thông tin để truy cập</p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-left block text-sm">Tên Moderator</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={tempModName}
                onChange={(e) => { setTempModName(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Nhập tên mod..."
                className="pl-9 bg-secondary border-border"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-left block text-sm">Mật khẩu</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="••••••••"
                className="pl-9 bg-secondary border-border"
              />
            </div>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button 
            onClick={handleLogin} 
            className="w-full gradient-gaming text-primary-foreground font-gaming"
          >
            ĐĂNG NHẬP
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminGate;
