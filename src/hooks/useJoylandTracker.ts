import { useState, useEffect, useCallback } from 'react';

export type EventType = 
  | "Tiny Adventures" 
  | "Crossroads of Fate" 
  | "Cube Battle" 
  | "Treasure Hunt" 
  | "Axe Ricocheting" 
  | "Frenzy Wheel";

interface State {
  seq: number | null;
  move: number;
  doneMask: number;
  modeStart: boolean;
}

interface TrackerData {
  states: State[];
  inputHistory: EventType[];
  cycleLocked: boolean;
  statesStack: State[][];
  cycleLockedStack: boolean[];
}

const sequences: Record<number, EventType[]> = {
  1: ["Tiny Adventures", "Crossroads of Fate", "Tiny Adventures", "Axe Ricocheting", "Tiny Adventures", "Tiny Adventures", "Crossroads of Fate", "Treasure Hunt", "Tiny Adventures", "Crossroads of Fate", "Tiny Adventures", "Axe Ricocheting", "Frenzy Wheel"],
  2: ["Tiny Adventures", "Tiny Adventures", "Cube Battle", "Tiny Adventures", "Crossroads of Fate", "Treasure Hunt", "Tiny Adventures", "Tiny Adventures", "Crossroads of Fate", "Frenzy Wheel", "Crossroads of Fate", "Tiny Adventures", "Axe Ricocheting"],
  3: ["Tiny Adventures", "Tiny Adventures", "Crossroads of Fate", "Treasure Hunt", "Tiny Adventures", "Tiny Adventures", "Cube Battle", "Tiny Adventures", "Crossroads of Fate", "Frenzy Wheel", "Tiny Adventures", "Axe Ricocheting", "Crossroads of Fate"],
  4: ["Tiny Adventures", "Tiny Adventures", "Treasure Hunt", "Tiny Adventures", "Crossroads of Fate", "Tiny Adventures", "Cube Battle", "Tiny Adventures", "Crossroads of Fate", "Tiny Adventures", "Crossroads of Fate", "Cube Battle", "Frenzy Wheel"]
};

export const abbrev: Record<EventType, string> = {
  "Tiny Adventures": "T",
  "Crossroads of Fate": "F",
  "Cube Battle": "A",
  "Treasure Hunt": "C",
  "Axe Ricocheting": "B",
  "Frenzy Wheel": "J"
};

const VERSION = "2.0.1";
const ALL_MASK = 0b1111;
const bit = (seq: number) => (1 << (seq - 1));

const STORAGE_KEY = "joyland_cycle_tracker";

export function useJoylandTracker() {
  const [states, setStates] = useState<State[]>([]);
  const [inputHistory, setInputHistory] = useState<EventType[]>([]);
  const [cycleLocked, setCycleLocked] = useState(false);
  const [statesStack, setStatesStack] = useState<State[][]>([]);
  const [cycleLockedStack, setCycleLockedStack] = useState<boolean[]>([]);

  // Load state on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data: TrackerData = JSON.parse(saved);
        setStates(data.states || []);
        setInputHistory(data.inputHistory || []);
        setCycleLocked(data.cycleLocked || false);
        setStatesStack(data.statesStack || []);
        setCycleLockedStack(data.cycleLockedStack || []);
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
  }, []);

  // Save state on change
  useEffect(() => {
    const data: TrackerData = { states, inputHistory, cycleLocked, statesStack, cycleLockedStack };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [states, inputHistory, cycleLocked, statesStack, cycleLockedStack]);

  const makeStartStates = useCallback((cycleReset: boolean, knownStart: boolean): State[] => {
    const out: State[] = [];
    for (let seq = 1; seq <= 4; seq++) {
      for (let doneMask = 0; doneMask <= ALL_MASK; doneMask++) {
        if (cycleReset && doneMask !== 0) continue;
        if (doneMask & bit(seq)) continue;
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
          out.push({ seq, move: pos, doneMask, modeStart: false });
        }
      }
    }
    return out;
  }, []);

  const advanceStatesWithEvent = useCallback((curStates: State[], event: EventType): State[] => {
    const next: State[] = [];
    for (const s of curStates) {
      if (s.seq === null || s.move === 0) {
        const doneMaskNorm = (s.doneMask === ALL_MASK) ? 0 : s.doneMask;
        for (let seq = 1; seq <= 4; seq++) {
          if (doneMaskNorm & bit(seq)) continue;
          if (sequences[seq][0] !== event) continue;
          next.push({ seq, move: 2, doneMask: doneMaskNorm, modeStart: true });
        }
        continue;
      }

      const expected = sequences[s.seq][s.move - 1];
      if (expected !== event) continue;

      const newMove = s.move + 1;

      if (newMove === 14) {
        const newDone = s.doneMask | bit(s.seq);
        next.push({ seq: null, move: 0, doneMask: newDone, modeStart: true });
      } else {
        next.push({ seq: s.seq, move: newMove, doneMask: s.doneMask, modeStart: s.modeStart });
      }
    }
    return next;
  }, []);

  const tap = useCallback((event: EventType) => {
    let newStates: State[];
    
    if (states.length === 0) {
      newStates = seedUnknownStates(event);
    } else {
      newStates = advanceStatesWithEvent(states, event);
    }

    newStates = dedupeStates(newStates);

    if (cycleLocked) {
      const counts = new Map<number, number>();
      for (const s of newStates) counts.set(s.doneMask, (counts.get(s.doneMask) || 0) + 1);
      let bestMask: number | null = null;
      let bestCount = -1;
      for (const [m, c] of counts.entries()) {
        if (c > bestCount) { bestCount = c; bestMask = m; }
      }
      if (bestMask !== null) {
        newStates = newStates.filter(s => s.doneMask === bestMask);
      }
    }

    const newHistory = [...inputHistory, event];
    const newStatesStack = [...statesStack, JSON.parse(JSON.stringify(newStates))];
    const newCycleLockedStack = [...cycleLockedStack, cycleLocked];

    setStates(newStates);
    setInputHistory(newHistory);
    setStatesStack(newStatesStack);
    setCycleLockedStack(newCycleLockedStack);
  }, [states, inputHistory, cycleLocked, statesStack, cycleLockedStack, seedUnknownStates, advanceStatesWithEvent, dedupeStates]);

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
    setInputHistory([]);
    setStates(makeStartStates(true, true));
    setCycleLocked(false);
    setStatesStack([]);
    setCycleLockedStack([]);
  }, [makeStartStates]);

  const startNewSequence = useCallback(() => {
    setInputHistory([]);
    setStates(makeStartStates(false, true));
    setStatesStack([]);
    setCycleLockedStack([]);
  }, [makeStartStates]);

  const unknownPosition = useCallback(() => {
  setStates([]);
  setStatesStack([]);
  setCycleLockedStack([]);
  // Keep inputHistory and cycleLocked as they are
}, []);

  const hardReset = useCallback(() => {
    setInputHistory([]);
    setStates([]);
    setCycleLocked(false);
    setStatesStack([]);
    setCycleLockedStack([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const copySaveCode = useCallback(async (): Promise<boolean> => {
    try {
      const payload = { v: VERSION, t: Date.now(), states, inputHistory, cycleLocked, statesStack, cycleLockedStack };
      const json = JSON.stringify(payload);
      const code = btoa(unescape(encodeURIComponent(json)));
      await navigator.clipboard.writeText(code);
      return true;
    } catch (e) {
      return false;
    }
  }, [states, inputHistory, cycleLocked, statesStack, cycleLockedStack]);

  const loadSaveCode = useCallback((code: string): boolean => {
    try {
      const json = decodeURIComponent(escape(atob(code.trim())));
      const payload = JSON.parse(json);
      setStates(payload.states || []);
      setInputHistory(payload.inputHistory || []);
      setCycleLocked(payload.cycleLocked || false);
      setStatesStack(payload.statesStack || []);
      setCycleLockedStack(payload.cycleLockedStack || []);
      return true;
    } catch (e) {
      return false;
    }
  }, []);

  // Compute allowed events
  const computeAllowedEvents = useCallback((): Set<EventType> | null => {
    const allowed = new Set<EventType>();

    if (states.length === 0) {
      if (inputHistory.length === 0) {
        return null; // Allow all
      }
      return new Set(); // No valid states
    }

    for (const s of states) {
      if (s.seq === null || s.move === 0) {
        const dmNorm = (s.doneMask === ALL_MASK) ? 0 : s.doneMask;
        for (let seq = 1; seq <= 4; seq++) {
          if (dmNorm & bit(seq)) continue;
          allowed.add(sequences[seq][0]);
        }
        continue;
      }

      const ev = sequences[s.seq][s.move - 1];
      if (ev) allowed.add(ev);
    }

    return allowed;
  }, [states, inputHistory]);

  // Compute display info
  const getDisplayInfo = useCallback(() => {
    const allowedEvents = computeAllowedEvents();
    
    if (states.length === 0) {
      return {
        status: inputHistory.length ? "No match. Use Reset All or Start New Sequence / Start Event." : "Waiting for input…",
        isLocked: false,
        currentSeq: null,
        currentMove: 0,
        nextEvent: null,
        alert: null,
        timeline: null,
        completedNums: [],
        remainingNums: [],
        cycleKnown: false,
        allowedEvents,
        possibleSeqs: [],
        possibleMoves: []
      };
    }

    const inSeqStates = states.filter(s => s.seq !== null && s.move !== 0);
    const betweenStates = states.filter(s => s.seq === null || s.move === 0);

    const seqSet = new Set(inSeqStates.map(s => s.seq));
    if (seqSet.size === 0 && betweenStates.length > 0) {
      for (const st of betweenStates) {
        const dmNorm = (st.doneMask === ALL_MASK) ? 0 : st.doneMask;
        for (let seq = 1; seq <= 4; seq++) {
          if (dmNorm & bit(seq)) continue;
          seqSet.add(seq);
        }
      }
    }

    const moveSet = new Set(inSeqStates.map(s => s.move));
    const doneMasks = new Set(states.map(s => s.doneMask));
    const locked = (seqSet.size === 1 && moveSet.size === 1 && betweenStates.length === 0);

    let completedNums: number[] = [];
    let remainingNums: number[] = [];
    const cycleKnown = (doneMasks.size === 1);

    if (cycleKnown) {
      const dm = [...doneMasks][0];
      const dmNorm = (dm === ALL_MASK) ? 0 : dm;
      completedNums = [1, 2, 3, 4].filter(x => dmNorm & bit(x));
      remainingNums = [1, 2, 3, 4].filter(x => !(dmNorm & bit(x)));
    }

    // Check for banner after T,T
    let banner: string | null = null;
    const last2 = inputHistory.slice(-2);
    if (last2.length === 2 && last2[0] === "Tiny Adventures" && last2[1] === "Tiny Adventures") {
      const candidates = inSeqStates.filter(s =>
        s.seq && sequences[s.seq][0] === "Tiny Adventures" &&
        sequences[s.seq][1] === "Tiny Adventures" &&
        s.move === 3
      );
      if (candidates.length) {
        const possibleThirdMoves = new Set(candidates.map(s => s.seq ? sequences[s.seq][2] : null));
        const hasCrossroads = possibleThirdMoves.has("Crossroads of Fate");
        const hasCube = possibleThirdMoves.has("Cube Battle");
        const hasTreasure = possibleThirdMoves.has("Treasure Hunt");

        if (!hasCrossroads && hasCube && hasTreasure) {
          banner = "Start-of-sequence: next is either Cube Battle (use 50×) or Treasure Hunt (50× if you need gold).";
        }
      }
    }

    if (!locked) {
      return {
        status: `Moves logged: ${inputHistory.length}\nPossible states: ${states.length}\nPossible sequences: ${[...seqSet].sort((a, b) => (a ?? 0) - (b ?? 0)).join(", ") || "(between sequences)"}\nPossible moves: ${[...moveSet].sort((a, b) => a - b).join(", ") || "(between sequences)"}`,
        isLocked: false,
        currentSeq: null,
        currentMove: 0,
        nextEvent: null,
        alert: null,
        banner,
        timeline: null,
        completedNums,
        remainingNums,
        cycleKnown,
        allowedEvents,
        possibleSeqs: [...seqSet].filter((s): s is number => s !== null).sort((a, b) => a - b),
        possibleMoves: [...moveSet].sort((a, b) => a - b)
      };
    }

    const s = inSeqStates[0];
    const seq = s.seq!;
    const nextExpected = s.move;
    const currentMove = s.move - 1;
    const moves = sequences[seq];
    const nextEvent = moves[nextExpected - 1];

    let alert: { type: 'cube' | 'treasure', message: string } | null = null;
    if (nextEvent === "Cube Battle") {
      alert = { type: 'cube', message: "🚨 ENABLE 50× NOW (Cube Battle is next)" };
    } else if (nextEvent === "Treasure Hunt") {
      alert = { type: 'treasure', message: "💰 Treasure Hunt is next — invest 50× if you need gold" };
    }

    // Find next special event index
    const upcoming = moves.slice(Math.max(0, nextExpected - 1));
    let nextSpecialIndex = -1;
    for (let i = 0; i < upcoming.length; i++) {
      if (upcoming[i] === "Cube Battle" || upcoming[i] === "Treasure Hunt") {
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
      isNextSpecial: nextSpecialIndex >= 0 && i + 1 === (nextExpected + nextSpecialIndex),
      isSpecial: ev === "Cube Battle" || ev === "Treasure Hunt"
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
      possibleMoves: [currentMove]
    };
  }, [states, inputHistory, computeAllowedEvents]);

  return {
    version: VERSION,
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
    getDisplayInfo
  };
}
