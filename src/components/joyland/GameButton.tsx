import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface GameButtonProps {
  icon: LucideIcon;
  letter: string;
  title: string;
  subtitle?: string;
  hint?: string;
  variant: 'green' | 'green-alt' | 'gray' | 'teal' | 'red' | 'blue' | 'gold' | 'purple' | 'dark' | 'dark-alt';
  onClick: () => void;
  disabled?: boolean;
}

const variantStyles = {
  'green': 'bg-gradient-to-br from-gaming-green to-gaming-green/80 text-primary-foreground gaming-glow-green',
  'green-alt': 'bg-gradient-to-br from-gaming-green/90 to-gaming-green/70 text-primary-foreground',
  'gray': 'bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground',
  'teal': 'bg-gradient-to-br from-gaming-teal to-gaming-teal/80 text-primary-foreground gaming-glow-teal',
  'red': 'bg-gradient-to-br from-gaming-red to-gaming-red/80 text-foreground gaming-glow-red',
  'blue': 'bg-gradient-to-br from-gaming-blue to-gaming-blue/80 text-primary-foreground gaming-glow-blue',
  'gold': 'bg-gradient-to-br from-gaming-gold to-gaming-gold/80 text-primary-foreground gaming-glow-gold',
  'purple': 'bg-gradient-to-br from-gaming-purple to-gaming-purple/80 text-foreground gaming-glow-purple',
  'dark': 'bg-gradient-to-br from-muted to-muted/80 text-foreground',
  'dark-alt': 'bg-gradient-to-br from-secondary to-muted text-foreground',
};

export function GameButton({ 
  icon: Icon, 
  letter, 
  title, 
  subtitle, 
  hint, 
  variant, 
  onClick, 
  disabled 
}: GameButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative w-full rounded-xl border-0 p-2",
        "transition-all duration-200 ease-out",
        "hover:scale-[1.02] hover:brightness-110",
        "active:scale-[0.98] active:brightness-95",
        "disabled:opacity-30 disabled:grayscale-[0.3] disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:brightness-100",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
        variantStyles[variant]
      )}
    >
      <div className="flex items-center gap-2 py-1.5">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-base font-black">{letter}</span>
          <Icon className="h-4 w-4 opacity-90" strokeWidth={2.5} />
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="text-xs font-bold leading-tight truncate">
            {title} {subtitle && <span className="opacity-90">{subtitle}</span>}
          </div>
          {hint && (
            <span className="text-[9px] font-medium opacity-60 italic">
              {hint}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
