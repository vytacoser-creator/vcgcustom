import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock } from "lucide-react";

const ADMIN_PASSWORD = "vcg2024admin";

interface AdminGateProps {
  children: React.ReactNode;
}

const AdminGate = ({ children }: AdminGateProps) => {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem("vcg-admin") === "true"
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("vcg-admin", "true");
      setAuthenticated(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (authenticated) return <>{children}</>;

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
          <p className="text-muted-foreground text-sm mt-1">Nhập mật khẩu moderator để truy cập</p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-left block text-sm">Mật khẩu</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="••••••••"
                className="pl-9 bg-secondary border-border"
              />
            </div>
          </div>
          {error && <p className="text-destructive text-sm">Sai mật khẩu!</p>}
          <Button onClick={handleLogin} className="w-full gradient-gaming text-primary-foreground font-gaming">
            ĐĂNG NHẬP
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminGate;
