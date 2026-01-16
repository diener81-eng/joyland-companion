import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface StatusCardProps {
  status: string;
  cycleLocked: boolean;
  cycleKnown: boolean;
  completedNums: number[];
  remainingNums: number[];
}

export function StatusCard({
  status,
  cycleLocked,
  cycleKnown,
  completedNums,
  remainingNums
}: StatusCardProps) {
  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <pre className="whitespace-pre-line text-sm text-muted-foreground font-mono">
        {status}
      </pre>
      
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Cycle status:</span>
          <Badge variant={cycleLocked ? "default" : "secondary"}>
            {cycleLocked ? "LOCKED" : "UNKNOWN"}
          </Badge>
        </div>
        
        {cycleKnown ? (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground">Completed:</span>
              {completedNums.length > 0 ? (
                completedNums.map(n => (
                  <Badge key={n} variant="outline" className="border-gaming-green text-gaming-green">
                    {n}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline" className="border-muted-foreground/50">none</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground">Remaining:</span>
              {remainingNums.map(n => (
                <Badge key={n} variant="outline" className="border-muted-foreground/50">
                  {n}
                </Badge>
              ))}
            </div>
          </>
        ) : (
          <Badge variant="outline" className="border-muted-foreground/50">
            Sequences: unknown
          </Badge>
        )}
      </div>
    </div>
  );
}
