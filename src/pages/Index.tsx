import LeaderboardTable from "@/components/LeaderboardTable";
import { Trophy } from "lucide-react";

const Index = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-2">
          <Trophy className="h-8 w-8 text-accent animate-pulse-glow" />
          <h1 className="font-gaming text-3xl sm:text-4xl font-bold text-glow text-primary">
            LEADERBOARD
          </h1>
          <Trophy className="h-8 w-8 text-accent animate-pulse-glow" />
        </div>
        <p className="text-muted-foreground">Bảng xếp hạng cộng đồng VCG</p>
      </div>
      <LeaderboardTable />
    </div>
  );
};

export default Index;
