import { cn } from "@/lib/utils";

interface TimelineCellProps {
  step: number;
  letter: string;
  isDone: boolean;
  isCurrent: boolean;
  isNextSpecial: boolean;
  isSpecial: boolean;
  event: string;
}

export function TimelineCell({
  step,
  letter,
  isDone,
  isCurrent,
  isNextSpecial,
  isSpecial,
  event
}: TimelineCellProps) {
  const isCube = event === "Cube Battle";
  const isTreasure = event === "Card Realm";

  return (
    <div
      className={cn(
        "relative w-11 h-11 rounded-xl flex flex-col items-center justify-center",
        "font-bold transition-all duration-300",
        // Base styling
        !isSpecial && "bg-secondary text-foreground",
        // Special events
        isCube && "bg-gaming-red border-2 border-foreground/50",
        isTreasure && "bg-gaming-blue border-2 border-foreground/50",
        // States
        isDone && "opacity-40",
        isCurrent && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
        isNextSpecial && "ring-2 ring-gaming-orange ring-offset-2 ring-offset-background animate-pulse-glow"
      )}
    >
      <span className="absolute top-1 left-2 text-[10px] opacity-60 font-semibold">
        {step}
      </span>
      <span className={cn(
        "text-lg mt-1",
        (isCube || isTreasure) && "font-black"
      )}>
        {letter}
      </span>
    </div>
  );
}
