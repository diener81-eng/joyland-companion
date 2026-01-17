import { cn } from "@/lib/utils";

interface SequenceTrackerProps {
  currentSeq: number | null;
  currentMove: number;
  completedNums: number[];
  cycleKnown: boolean;
}

export function SequenceTracker({
  currentSeq,
  currentMove,
  completedNums,
  cycleKnown,
}: SequenceTrackerProps) {
  const sequences = [1, 2, 3, 4];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">Sequence:</span>
      <div className="flex gap-1.5">
        {sequences.map((seq) => {
          const isCompleted = completedNums.includes(seq);
          const isCurrent = currentSeq === seq;

          return (
            <div
              key={seq}
              className={cn(
                "flex items-center justify-center rounded-full border-2 min-w-[52px] h-[28px] px-2 transition-all",
                isCompleted && "border-gaming-green bg-gaming-green/20",
                isCurrent && "border-gaming-orange bg-gaming-orange/20 gaming-glow-orange",
                !isCompleted && !isCurrent && "border-muted-foreground/30 bg-muted/20"
              )}
            >
              <span
                className={cn(
                  "font-bold whitespace-nowrap",
                  isCompleted && "text-gaming-green text-xs",
                  isCurrent && "text-gaming-orange text-[10px]",
                  !isCompleted && !isCurrent && "text-muted-foreground text-xs"
                )}
              >
                {isCurrent ? `${seq} (${currentMove}/13)` : seq}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
