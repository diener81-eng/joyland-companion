import { useState } from "react";
import { useJoylandTracker, EventType, abbrev } from "@/hooks/useJoylandTracker";
import { GameButton } from "@/components/joyland/GameButton";
import { TimelineCell } from "@/components/joyland/TimelineCell";
import { StatusCard } from "@/components/joyland/StatusCard";
import { AlertBanner } from "@/components/joyland/AlertBanner";
import { HistoryLog } from "@/components/joyland/HistoryLog";
import { toast } from "sonner";
import {
  Play,
  SkipForward,
  Puzzle,
  Compass,
  Dice5,
  Coins,
  Axe,
  Disc3,
  Save,
  Download,
  Undo2,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const eventConfig: Record<EventType, { 
  icon: typeof Puzzle; 
  letter: string; 
  title: string; 
  subtitle: string; 
  hint?: string;
  variant: 'gray' | 'teal' | 'red' | 'blue' | 'green-alt' | 'gold';
}> = {
  "Tiny Adventures": { icon: Puzzle, letter: "T", title: "Tiny", subtitle: "Adventures", variant: "gray" },
  "Crossroads of Fate": { icon: Compass, letter: "F", title: "Crossroads", subtitle: "of Fate", variant: "teal" },
  "Cube Battle": { icon: Dice5, letter: "A", title: "Cube", subtitle: "Battle", hint: "(wiki: Axe Ricochet)", variant: "red" },
  "Treasure Hunt": { icon: Coins, letter: "C", title: "Treasure", subtitle: "Hunt", hint: "(wiki: Card Realm)", variant: "blue" },
  "Axe Ricocheting": { icon: Axe, letter: "B", title: "Axe", subtitle: "Ricocheting", hint: "(wiki: Blocks Duel)", variant: "green-alt" },
  "Frenzy Wheel": { icon: Disc3, letter: "J", title: "Frenzy", subtitle: "Wheel", hint: "(wiki: Jackpot)", variant: "gold" },
};

export default function Index() {
  const tracker = useJoylandTracker();
  const displayInfo = tracker.getDisplayInfo();
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [saveCode, setSaveCode] = useState("");

  const handleCopySave = async () => {
    const success = await tracker.copySaveCode();
    if (success) {
      toast.success("Save code copied to clipboard!");
    } else {
      toast.error("Failed to copy save code");
    }
  };

  const handleLoadSave = () => {
    if (!saveCode.trim()) {
      toast.error("Please enter a save code");
      return;
    }
    const success = tracker.loadSaveCode(saveCode);
    if (success) {
      toast.success("Save code loaded successfully!");
      setLoadDialogOpen(false);
      setSaveCode("");
    } else {
      toast.error("Invalid save code");
    }
  };

  const isEventDisabled = (event: EventType): boolean => {
    if (!displayInfo.allowedEvents) return false;
    return !displayInfo.allowedEvents.has(event);
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-8">
      <div className="mx-auto max-w-xl space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Joyland Tracker</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            Tap each event as it appears in Joyland.
            <br />
            You will be warned when to use <strong>50× compass</strong>.
            <br />
            <span className="text-gaming-red">Cube Battle</span> → always 50×{" "}
            <span className="opacity-70 italic">(wiki: Axe Ricochet)</span>
            <br />
            <span className="text-gaming-blue">Treasure Hunt</span> → 50× only if you need gold{" "}
            <span className="opacity-70 italic">(wiki: Card Realm)</span>
          </p>
        </div>

        {/* Control Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <GameButton
            icon={Play}
            letter="🟢"
            title="Start Event"
            subtitle="(cycle reset)"
            variant="green"
            onClick={tracker.startEventReset}
          />
          <GameButton
            icon={SkipForward}
            letter="🟩"
            title="New Sequence"
            subtitle="(move 1)"
            variant="green-alt"
            onClick={tracker.startNewSequence}
          />
        </div>

        {/* Separator */}
        <div className="h-px bg-border rounded-full" />

        {/* Event Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(eventConfig) as EventType[]).map((event) => {
            const config = eventConfig[event];
            return (
              <GameButton
                key={event}
                icon={config.icon}
                letter={config.letter}
                title={config.title}
                subtitle={config.subtitle}
                hint={config.hint}
                variant={config.variant}
                onClick={() => tracker.tap(event)}
                disabled={isEventDisabled(event)}
              />
            );
          })}
        </div>

        {/* Separator */}
        <div className="h-px bg-border rounded-full" />

        {/* Save/Load Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <GameButton
            icon={Save}
            letter="💾"
            title="Copy"
            subtitle="Save Code"
            variant="dark"
            onClick={handleCopySave}
          />
          <GameButton
            icon={Download}
            letter="📥"
            title="Load"
            subtitle="Save Code"
            variant="dark-alt"
            onClick={() => setLoadDialogOpen(true)}
          />
        </div>

        {/* Separator */}
        <div className="h-px bg-border rounded-full" />

        {/* Undo/Reset Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <GameButton
            icon={Undo2}
            letter="↩️"
            title="Undo"
            subtitle="Last Tap"
            variant="purple"
            onClick={tracker.undo}
          />
          <GameButton
            icon={Trash2}
            letter="🧼"
            title="Reset"
            subtitle="All"
            variant="dark"
            onClick={tracker.hardReset}
          />
        </div>

        {/* Alert Banner */}
        {displayInfo.alert && (
          <AlertBanner type={displayInfo.alert.type} message={displayInfo.alert.message} />
        )}

        {/* Info Banner */}
        {displayInfo.banner && (
          <div className="glass-card rounded-xl p-3 text-sm text-gaming-orange font-semibold">
            {displayInfo.banner}
          </div>
        )}

        {/* Timeline - moved above status */}
        {displayInfo.timeline && (
          <div className="space-y-2">
            <div className="grid grid-cols-6 gap-2 justify-items-center">
              {displayInfo.timeline.slice(0, 6).map((cell) => (
                <TimelineCell key={cell.step} {...cell} />
              ))}
            </div>
            <div className="grid grid-cols-6 gap-2 justify-items-center">
              {displayInfo.timeline.slice(6, 12).map((cell) => (
                <TimelineCell key={cell.step} {...cell} />
              ))}
              {displayInfo.timeline[12] && (
                <TimelineCell {...displayInfo.timeline[12]} />
              )}
            </div>
          </div>
        )}

        {/* Status Card */}
        <StatusCard
          status={displayInfo.status}
          cycleLocked={tracker.cycleLocked}
          cycleKnown={displayInfo.cycleKnown}
          completedNums={displayInfo.completedNums}
          remainingNums={displayInfo.remainingNums}
        />

        {/* History Log */}
        <HistoryLog history={tracker.inputHistory} />

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-2">
          Joyland Tracker v{tracker.version}
        </div>
      </div>

      {/* Load Dialog */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Save Code</DialogTitle>
            <DialogDescription>
              Paste your save code below to restore your progress.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Paste save code here..."
            value={saveCode}
            onChange={(e) => setSaveCode(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLoadSave}>Load</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
