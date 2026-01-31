import { useState, useEffect, useCallback } from "react";

export type EventType =
  | "Tiny Adventures"
  | "Crossroads of Fate"
  | "Cube Battle"
  | "Card Realm"
  | "Axe Ricocheting"
  | "Frenzy Wheel";

interface State {
  seq: number | null;
  move: number; // 1..13 when in sequence, or 0 when between sequences
  doneMask: number; // bitmask of completed sequences within the cycle
  modeStart: boolean;
}

interface TrackerData {
  states: State[];
  inputHistory: EventType[];
  cycleLocked: boolean;
  statesStack: State[][];
  cycleLockedStack: boolean[];
  hasStarted: boolean; // ✅ NEW: unlock UI even when states/history are empty
}

const sequences: Record<number, EventType[]> = {
  1: [
    "Tiny Adventures",
    "Crossroads of Fate",
    "Tiny Adventures",
    "Axe Ricocheting",
    "Tiny Adventures",
    "Tiny Adventures",
    "Crossroads of Fate",
    "Card Realm",
    "Tiny Adventures",
    "Crossroads of Fate",
    "Tiny Adventures",
    "Axe Ricocheting",
    "Frenzy Wheel",
  ],
  2: [
    "Tiny Adventures",
    "Tiny Adventures",
    "Cube Battle",
    "Tiny Adventures",
    "Crossroads of Fate",
    "Card Realm",
    "Tiny Adventures",
    "Tiny Adventures",
    "Crossroads of Fate",
    "Frenzy Wheel",
    "Crossroads of Fate",
    "Tiny Adventures",
    "Axe Ricocheting",
  ],
  3: [
    "Tiny Adventures",
    "Tiny Adventures",
    "Crossroads of Fate",
    "Card Realm",
    "Tiny Adventures",
    "Tiny Adventures",
    "Cube Battle",
    "Tiny Adventures",
    "Crossroads of Fate",
    "Frenzy Wheel",
    "Tiny Adventures",
    "Axe Ricocheting",
    "Crossroads of Fate",
  ],
  4: [
    "Tiny Adventures",
    "Tiny Adventures",
    "Card Realm",
    "Tiny Adventures",
    "Crossroads of Fate",
    "Tiny Adventures",
    "Cube Battle",
    "Tiny Adventures",
    "Crossroads of Fate",
    "Tiny Adventures",
    "Crossroads of Fate",
    "Cube Battle",
    "Frenzy Wheel",
  ],
};

export const abbrev: Record<EventType, string> = {
  "Tiny Adventures": "T",
  "Crossroads of Fate": "F",
  "Cube Battle": "B",
  "Card Realm": "C",
  "Axe Ricocheting": "R",
  "Frenzy Wheel": "W",
};

const VERSION = "2.0.2"; // bump for hasStarted persistence
const STORAGE_KEY = "joyland_cycle_tracker";

const ALL_MASK = 0b1111;
const bit = (seq: number) => 1 << (seq - 1);

export function useJoylandTracker() {
  const [states, setStates] = useState<State[]>([]);
  const [inputHistory, setInputHistory] = useState<EventType[]>([]);
  const [cycleLocked, setCycleLocked] = useState(false);
  const [statesStack, setStatesStack] = useState<State[][]>([]);
  const [cycleLockedStack, setCycleLockedStack] = useState<boolean[]>([]);
  const [hasStarted, setHasStarted] = useState(false); // ✅ NEW

  /* ------------------ Load on mount ------------------ */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const data: Partial<TrackerData> = JSON.parse(saved);

      setStates(data.states || []);
      setInputHistory(data.inputHistory || []);
      setCycleLocked(data.cycleLocked || false);
      setStatesStack(data.statesStack || []);
      setCycleLockedStack(data.cycleLockedStack || []);
      setHasStarted(data.hasStarted || false);
    } catch (e) {
      console.error("Failed to load tracker state:", e);
    }
  }, []);

  /* ------------------ Save on change ------------------ */
  useEffect(() => {
    const data: TrackerData = {
      states,
      inputHistory,
      cycleLocked,
      statesStack,
      cycleLockedStack,
      hasStarted,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [states, inputHistory, cycleLocked, statesStack, cycleLockedStack, hasStarted]);

  /* ------------------ Core helpers ------------------ */
  const makeStartStates = useCallback((cycleReset: boolean, knownStart: boolean): State[] => {
    const out: State[] = [];
    for (let seq = 1; seq <= 4; seq++) {
      for (let doneMask = 0; doneMask <= ALL_MASK; doneMask++) {
        if (cycleReset && doneMask !== 0) continue;
        if (doneMask & bit(seq)) continue; // can't be "currently in" a completed sequence
        out.push({ seq, move: 1, doneMask, modeStart: knownStart });
      }
    }
    return out;
  }, []);

  const dedupeStates = useCallback((list: State[]): State[] => {
    const seen = new Set<string>();
    const out: State[] = [];
    for (const s of list) {
      const k = `${s.seq ?? "X"}|${s.move}|${s.doneMask}|${s.modeStart ? 1 : 0}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(s);
    }
    return out;
  }, []);

  const seedUnknownStates = useCallback((firstEvent: EventType): State[] => {
    const out: State[] = [];
    for (let seq = 1; seq <= 4; seq++) {
      const moves = sequences[seq];
      for (let pos = 1; pos <= 13; pos++) {
        if (moves[pos - 1] !== firstEvent) continue;

        for (let doneMask = 0; doneMask <= ALL_MASK; doneMask++) {
          if (doneMask & bit(seq)) continue;
          // We are currently at `pos` (the tapped event matches this position)
          out.push({ seq, move: pos, doneMask, modeStart: false });
        }
      }
    }
    return out;
  }, []);

  const advanceStatesWithEvent = useCallback((curStates: State[], event: EventType): State[] => {
    const next: State[] = [];

    for (const s of curStates) {
      // Between sequences: choose a new sequence start
      if (s.seq === null || s.move === 0) {
        const doneMaskNorm = s.doneMask === ALL_MASK ? 0 : s.doneMask;

        for (let seq = 1; seq <= 4; seq++) {
          if (doneMaskNorm & bit(seq)) continue;
          if (sequences[seq][0] !== event) continue;
          next.push({ seq, move: 2, doneMask: doneMaskNorm, modeStart: true });
        }
        continue;
      }

      // In a sequence: must match expected event
      const expected = sequences[s.seq][s.move - 1];
      if (expected !== event) continue;

      const newMove = s.move + 1;

      // Completed move 13 -> go "between sequences" and mark sequence done
      if (newMove === 14) {
        const newDone = s.doneMask | bit(s.seq);
        next.push({ seq: null, move: 0, doneMask: newDone, modeStart: true });
      } else {
        next.push({ seq: s.seq, move: newMove, doneMask: s.doneMask, modeStart: s.modeStart });
      }
    }

    return next;
  }, []);

  /* ------------------ Actions ------------------ */
  const tap = useCallback(
    (event: EventType) => {
      setHasStarted(true);

      let newStates: State[];

      if (states.length === 0) {
        // If user is “unknown position”, we seed the possible positions where this event could appear,
        // then advance once so the *next* expected move is correct.
        const seeded = seedUnknownStates(event);
        newStates = advanceStatesWithEvent(seeded, event);
      } else {
        newStates = advanceStatesWithEvent(states, event);
      }

      newStates = dedupeStates(newStates);

      // If cycle is locked, keep only the most common doneMask
      if (cycleLocked) {
        const counts = new Map<number, number>();
        for (const s of newStates) counts.set(s.doneMask, (counts.get(s.doneMask) || 0) + 1);

        let bestMask: number | null = null;
        let bestCount = -1;
        for (const [m, c] of counts.entries()) {
          if (c > bestCount) {
            bestCount = c;
            bestMask = m;
          }
        }
        if (bestMask !== null) {
          newStates = newStates.filter((s) => s.doneMask === bestMask);
        }
      }

      const newHistory = [...inputHistory, event];
      const newStatesStack = [...statesStack, JSON.parse(JSON.stringify(newStates))];
      const newCycleLockedStack = [...cycleLockedStack, cycleLocked];

      setStates(newStates);
      setInputHistory(newHistory);
      setStatesStack(newStatesStack);
      setCycleLockedStack(newCycleLockedStack);
    },
    [states, inputHistory, cycleLocked, statesStack, cycleLockedStack, seedUnknownStates, advanceStatesWithEvent, dedupeStates]
  );

  const undo = useCallback(() => {
    if (inputHistory.length === 0) return;

    const newHistory = inputHistory.slice(0, -1);
    const newStatesStack = statesStack.slice(0, -1);
    const newCycleLockedStack = cycleLockedStack.slice(0, -1);

    let newStates: State[] = [];
    let newCycleLocked = false;

    if (newStatesStack.length > 0) {
      newStates = JSON.parse(JSON.stringify(newStatesStack[newStatesStack.length - 1]));
      newCycleLocked = newCycleLockedStack[newCycleLockedStack.length - 1] || false;
    }

    setInputHistory(newHistory);
    setStatesStack(newStatesStack);
    setCycleLockedStack(newCycleLockedStack);
    setStates(newStates);
    setCycleLocked(newCycleLocked);
  }, [inputHistory, statesStack, cycleLockedStack]);

  const startEventReset = useCallback(() => {
    setHasStarted(true);
    setInputHistory([]);
    setStates(makeStartStates(true, true));
    setCycleLocked(false);
    setStatesStack([]);
    setCycleLockedStack([]);
  }, [makeStartStates]);

  const startNewSequence = useCallback(() => {
    setHasStarted(true);
    setInputHistory([]);
    setStates(makeStartStates(false, true));
    setStatesStack([]);
    setCycleLockedStack([]);
  }, [makeStartStates]);

  const unknownPosition = useCallback(() => {
    // ✅ This is what fixes your “click Unknown and then nothing works” issue:
    // it must mark the UI as “started” even though states/history might be empty.
    setHasStarted(true);
    setStates([]);
    setStatesStack([]);
    setCycleLockedStack([]);
    // Keep inputHistory and cycleLocked unchanged on purpose
  }, []);

  const hardReset = useCallback(() => {
    setHasStarted(false);
    setInputHistory([]);
    setStates([]);
    setCycleLocked(false);
    setStatesStack([]);
    setCycleLockedStack([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  /* ------------------ Save code ------------------ */
  const copySaveCode = useCallback(async (): Promise<boolean> => {
    try {
      const payload = {
        v: VERSION,
        t: Date.now(),
        states,
        inputHistory,
        cycleLocked,
        statesStack,
        cycleLockedStack,
        hasStarted,
      };
      const json = JSON.stringify(payload);
      const code = btoa(unescape(encodeURIComponent(json)));
      await navigator.clipboard.writeText(code);
      return true;
    } catch {
      return false;
    }
  }, [states, inputHistory, cycleLocked, statesStack, cycleLockedStack, hasStarted]);

  const loadSaveCode = useCallback((code: string): boolean => {
    try {
      const json = decodeURIComponent(escape(atob(code.trim())));
      const payload = JSON.parse(json);

      setStates(payload.states || []);
      setInputHistory(payload.inputHistory || []);
      setCycleLocked(payload.cycleLocked || false);
      setStatesStack(payload.statesStack || []);
      setCycleLockedStack(payload.cycleLockedStack || []);
      setHasStarted(true); // ✅ always unlock UI on load

      return true;
    } catch {
      return false;
    }
  }, []);

  /* ------------------ Allowed events (for disabling buttons) ------------------ */
  const computeAllowedEvents = useCallback((): Set<EventType> | null => {
    const allowed = new Set<EventType>();

    if (states.length === 0) {
      if (inputHistory.length === 0) {
        // “No tracking yet” -> allow all (Index.tsx can still gate with hasStarted)
        return null;
      }
      // History exists but no states match -> allow none
      return new Set();
    }

    for (const s of states) {
      // Between sequences: allowed = any sequence start not in doneMask
      if (s.seq === null || s.move === 0) {
        const dmNorm = s.doneMask === ALL_MASK ? 0 : s.doneMask;
        for (let seq = 1; seq <= 4; seq++) {
          if (dmNorm & bit(seq)) continue;
          allowed.add(sequences[seq][0]);
        }
        continue;
      }

      // In sequence: allowed = the exact expected event
      const ev = sequences[s.seq][s.move - 1];
      if (ev) allowed.add(ev);
    }

    return allowed;
  }, [states, inputHistory]);

  /* ------------------ Display info ------------------ */
  const getDisplayInfo = useCallback(() => {
    const allowedEvents = computeAllowedEvents();

    if (states.length === 0) {
      return {
        status: inputHistory.length
          ? "No match. Use Reset All or Start New Sequence / Start Event."
          : "Waiting for input…",
        isLocked: false,
        currentSeq: null as number | null,
        currentMove: 0,
        nextEvent: null as EventType | null,
        alert: null as { type: "cube" | "treasure"; message: string } | null,
        banner: null as string | null,
        timeline: null as
          | {
              step: number;
              event: EventType;
              letter: string;
              isDone: boolean;
              isCurrent: boolean;
              isNextSpecial: boolean;
              isSpecial: boolean;
            }[]
          | null,
        completedNums: [] as number[],
        remainingNums: [] as number[],
        cycleKnown: false,
        allowedEvents,
        possibleSeqs: [] as number[],
        possibleMoves: [] as number[],
      };
    }

    const inSeqStates = states.filter((s) => s.seq !== null && s.move !== 0);
    const betweenStates = states.filter((s) => s.seq === null || s.move === 0);

    const seqSet = new Set<number>();
    for (const s of inSeqStates) if (s.seq) seqSet.add(s.seq);

    if (seqSet.size === 0 && betweenStates.length > 0) {
      for (const st of betweenStates) {
        const dmNorm = st.doneMask === ALL_MASK ? 0 : st.doneMask;
        for (let seq = 1; seq <= 4; seq++) {
          if (dmNorm & bit(seq)) continue;
          seqSet.add(seq);
        }
      }
    }

    const moveSet = new Set<number>();
    for (const s of inSeqStates) moveSet.add(s.move);

    const doneMasks = new Set(states.map((s) => s.doneMask));
    const locked = seqSet.size === 1 && moveSet.size === 1 && betweenStates.length === 0;

    let completedNums: number[] = [];
    let remainingNums: number[] = [];
    const cycleKnown = doneMasks.size === 1;

    if (cycleKnown) {
      const dm = [...doneMasks][0];
      const dmNorm = dm === ALL_MASK ? 0 : dm;
      completedNums = [1, 2, 3, 4].filter((x) => dmNorm & bit(x));
      remainingNums = [1, 2, 3, 4].filter((x) => !(dmNorm & bit(x)));
    }

    // Banner after T,T
    let banner: string | null = null;
    const last2 = inputHistory.slice(-2);
    if (last2.length === 2 && last2[0] === "Tiny Adventures" && last2[1] === "Tiny Adventures") {
      const candidates = inSeqStates.filter(
        (s) =>
          s.seq !== null &&
          sequences[s.seq][0] === "Tiny Adventures" &&
          sequences[s.seq][1] === "Tiny Adventures" &&
          s.move === 3
      );

      if (candidates.length) {
        const possibleThirdMoves = new Set<EventType>(candidates.map((s) => sequences[s.seq!][2]));
        const hasCrossroads = possibleThirdMoves.has("Crossroads of Fate");
        const hasCube = possibleThirdMoves.has("Cube Battle");
        const hasTreasure = possibleThirdMoves.has("Card Realm");

        if (!hasCrossroads && hasCube && hasTreasure) {
          banner =
            "Start-of-sequence: next is either Cube Battle (use 50×) or Card Realm (50× if you need gold).";
        }
      }
    }

    if (!locked) {
      return {
        status:
          `Moves logged: ${inputHistory.length}\n` +
          `Possible states: ${states.length}\n` +
          `Possible sequences: ${[...seqSet].sort((a, b) => a - b).join(", ") || "(between sequences)"}\n` +
          `Possible moves: ${[...moveSet].sort((a, b) => a - b).join(", ") || "(between sequences)"}`,
        isLocked: false,
        currentSeq: null as number | null,
        currentMove: 0,
        nextEvent: null as EventType | null,
        alert: null as { type: "cube" | "treasure"; message: string } | null,
        banner,
        timeline: null,
        completedNums,
        remainingNums,
        cycleKnown,
        allowedEvents,
        possibleSeqs: [...seqSet].sort((a, b) => a - b),
        possibleMoves: [...moveSet].sort((a, b) => a - b),
      };
    }

    const s = inSeqStates[0];
    const seq = s.seq!;
    const nextExpected = s.move;
    const currentMove = s.move - 1;
    const moves = sequences[seq];
    const nextEvent = moves[nextExpected - 1];

    let alert: { type: "cube" | "treasure"; message: string } | null = null;
    if (nextEvent === "Cube Battle") {
      alert = { type: "cube", message: "🚨 ENABLE 50× NOW (Cube Battle is next)" };
    } else if (nextEvent === "Card Realm") {
      alert = { type: "treasure", message: "💰 Card Realm is next — invest 50× if you need gold" };
    }

    // Find next special
    const upcoming = moves.slice(Math.max(0, nextExpected - 1));
    let nextSpecialIndex = -1;
    for (let i = 0; i < upcoming.length; i++) {
      if (upcoming[i] === "Cube Battle" || upcoming[i] === "Card Realm") {
        nextSpecialIndex = i;
        break;
      }
    }

    const timeline = moves.map((ev, i) => ({
      step: i + 1,
      event: ev,
      letter: abbrev[ev],
      isDone: i + 1 < currentMove,
      isCurrent: i + 1 === currentMove,
      isNextSpecial: nextSpecialIndex >= 0 && i + 1 === nextExpected + nextSpecialIndex,
      isSpecial: ev === "Cube Battle" || ev === "Card Realm",
    }));

    return {
      status: `Sequence ${seq}\nMove ${currentMove} / 13`,
      isLocked: true,
      currentSeq: seq,
      currentMove,
      nextEvent,
      alert,
      banner,
      timeline,
      completedNums,
      remainingNums,
      cycleKnown,
      allowedEvents,
      possibleSeqs: [seq],
      possibleMoves: [currentMove],
    };
  }, [states, inputHistory, computeAllowedEvents]);

  return {
    version: VERSION,
    hasStarted, //

    inputHistory,
    cycleLocked,

    tap,
    undo,

    startEventReset,
    startNewSequence,
    unknownPosition,
    hardReset,

    copySaveCode,
    loadSaveCode,

    getDisplayInfo,
  };
}
