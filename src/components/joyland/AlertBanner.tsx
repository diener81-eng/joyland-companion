import { cn } from "@/lib/utils";
import { AlertTriangle, Coins } from "lucide-react";

interface AlertBannerProps {
  type: 'cube' | 'treasure';
  message: string;
}

export function AlertBanner({ type, message }: AlertBannerProps) {
  const isCube = type === 'cube';
  
  return (
    <div
      className={cn(
        "rounded-xl p-4 flex items-center gap-3 animate-pulse-glow",
        isCube 
          ? "bg-gaming-red/20 border border-gaming-red/50" 
          : "bg-gaming-gold/20 border border-gaming-gold/50"
      )}
    >
      {isCube ? (
        <AlertTriangle className="h-6 w-6 text-gaming-red shrink-0" />
      ) : (
        <Coins className="h-6 w-6 text-gaming-gold shrink-0" />
      )}
      <p className={cn(
        "font-bold text-sm",
        isCube ? "text-gaming-red" : "text-gaming-gold"
      )}>
        {message}
      </p>
    </div>
  );
}
