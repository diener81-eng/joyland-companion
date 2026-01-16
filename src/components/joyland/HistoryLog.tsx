import { ScrollArea } from "@/components/ui/scroll-area";
import type { EventType } from "@/hooks/useJoylandTracker";

interface HistoryLogProps {
  history: EventType[];
}

export function HistoryLog({ history }: HistoryLogProps) {
  if (history.length === 0) {
    return (
      <div className="glass-card rounded-xl p-4 text-center text-sm text-muted-foreground">
        No events logged yet
      </div>
    );
  }

  return (
    <ScrollArea className="glass-card rounded-xl h-28">
      <div className="p-4 space-y-1">
        {history.map((event, i) => (
          <div key={i} className="text-sm text-muted-foreground font-mono">
            <span className="text-foreground/60">{i + 1}.</span> {event}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
