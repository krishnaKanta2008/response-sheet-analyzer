"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

import type { AnalysisResult } from "./types";

const STORAGE_KEY = "response-sheet-analyzer:result";

/**
 * sessionStorage is an external store, so it is read through
 * `useSyncExternalStore` rather than mirrored into state with an effect. That
 * also means the server snapshot (null) is used during hydration and the real
 * value is swapped in immediately afterwards, with no hydration mismatch.
 */

let cache: AnalysisResult | null | undefined;
const listeners = new Set<() => void>();

function readStorage(): AnalysisResult | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnalysisResult) : null;
  } catch {
    return null;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AnalysisResult | null {
  cache ??= readStorage();
  return cache;
}

/** No sheet is known during server rendering. */
function getServerSnapshot(): AnalysisResult | null {
  return null;
}

function write(next: AnalysisResult | null): void {
  cache = next;
  try {
    if (next) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be full or blocked; the in-memory value still works.
  }
  for (const listener of listeners) listener();
}

interface ResultContextValue {
  result: AnalysisResult | null;
  setResult: (result: AnalysisResult) => void;
  clear: () => void;
}

const ResultContext = createContext<ResultContextValue | null>(null);

export function ResultProvider({ children }: { children: React.ReactNode }) {
  const result = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setResult = useCallback((next: AnalysisResult) => write(next), []);
  const clear = useCallback(() => write(null), []);

  const value = useMemo(
    () => ({ result, setResult, clear }),
    [result, setResult, clear],
  );

  return <ResultContext.Provider value={value}>{children}</ResultContext.Provider>;
}

export function useResult(): ResultContextValue {
  const context = useContext(ResultContext);
  if (!context) {
    throw new Error("useResult must be used inside a <ResultProvider>.");
  }
  return context;
}
