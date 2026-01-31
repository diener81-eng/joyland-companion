import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface GameButtonProps {
  icon: LucideIcon;
  letter: string;
  title: string;
  subtitle?: string;

  variant: 'green' | 'green-alt' | 'gray' | 'teal' | 'red' | 'blue' | 'blue-dark' | 'pink' | 'gold' | 'purple' | 'purple-dim' | 'dark' | 'dark-alt';

  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
  highlight?: boolean;
}


const variantStyles = {
  'green': 'bg-gradient-to-br from-gaming-green/60 to-gaming-green/50 text-primary-foreground', 
  'green-alt': 'bg-gradient-to-br from-gaming-green/50 to-gaming-green/40 text-primary-foreground', 
  'gray': 'bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground',
  'teal': 'bg-gradient-to-br from-gaming-teal to-gaming-teal/80 text-primary-foreground gaming-glow-teal',
  'red': 'bg-gradient-to-br from-gaming-red to-gaming-red/80 text-foreground gaming-glow-red',
  'blue': 'bg-gradient-to-br from-gaming-blue to-gaming-blue/80 text-primary-foreground gaming-glow-blue',
  'blue-dark': 'bg-gradient-to-br from-[#044280] to-[#044280]/80 text-primary-foreground',
  'pink': 'bg-gradient-to-br from-pink-300 to-pink-400/80 text-black', 
  'gold': 'bg-gradient-to-br from-gaming-gold to-gaming-gold/80 text-primary-foreground gaming-glow-gold',
  'purple': 'bg-gradient-to-br from-gaming-purple to-gaming-purple/80 text-foreground gaming-glow-purple',
  'purple-dim': 'bg-gradient-to-br from-gaming-purple/75 to-gaming-purple/55 text-foreground',


  'dark': 'bg-gradient-to-br from-muted to-muted/80 text-foreground',
  'dark-alt': 'bg-gradient-to-br from-secondary to-muted text-foreground',
};

export function GameButton({ 
  icon: Icon, 
  letter, 
  title, 
  subtitle, 
  variant, 
  onClick, 
  disabled,
  compact = false,
  highlight = false
}: GameButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative rounded-xl border-0",
        "transition-all duration-200 ease-out",
        "hover:scale-[1.02]",
        "active:scale-[0.98]",
        "disabled:opacity-30 disabled:grayscale-[0.3] disabled:cursor-not-allowed disabled:hover:scale-100",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
        variantStyles[variant],

        // 🔥 Highlight when important & enabled
        highlight && !disabled && [
          "brightness-125",
          "shadow-[0_0_18px_rgba(46,204,113,0.55)]",
          "animate-pulse"
        ],

        compact ? "px-3 py-1.5" : "w-[70%] max-w-[200px] p-2"
      )}
    >
      <div className={cn(
        "flex items-center justify-center gap-2",
        compact ? "" : "py-2"
      )}>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn("font-black", compact ? "text-sm" : "text-base")}>{letter}</span>
          <Icon className={cn("opacity-90", compact ? "h-3 w-3" : "h-4 w-4")} strokeWidth={2.5} />
        </div>

        <div className="text-center min-w-0">
          <div className={cn("font-bold leading-tight", compact ? "text-[10px]" : "text-xs")}>
            {title} {subtitle && <span className="opacity-90">{subtitle}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

