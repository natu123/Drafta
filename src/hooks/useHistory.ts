"use client";

import { useState, useCallback, useMemo } from 'react';

type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

export const useHistory = <T,>(initialPresent: T) => {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialPresent,
    future: [],
  });

  const canUndo = state.past.length !== 0;
  const canRedo = state.future.length !== 0;

  const undo = useCallback(() => {
    if (!canUndo) return;
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, state.past.length - 1);
    setState({
      past: newPast,
      present: previous,
      future: [state.present, ...state.future],
    });
  }, [canUndo, state.present, state.future, state.past]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    setState({
      past: [...state.past, state.present],
      present: next,
      future: newFuture,
    });
  }, [canRedo, state.present, state.future, state.past]);

  const set = useCallback((newPresent: T) => {
    // This is a special case to handle the textarea onChange event.
    // We don't want to create a history entry for every keystroke.
    // The component using this hook will need to decide when to commit to history.
    // For now, we'll just update the present.
    // A better approach would be to debounce this.
    // However, for the editor, we will call this from onChange, and a debounced useEffect
    // will call a new "commit" function.
    
    // Simplified for now: every change is a history entry.
     if (newPresent === state.present) return;
    setState({
      past: [...state.past, state.present],
      present: newPresent,
      future: [],
    });
  }, [state.present, state.past]);
  
  const reset = useCallback((newPresent: T) => {
     setState({
        past: [],
        present: newPresent,
        future: [],
    });
  }, []);

  return { state: state.present, set, undo, redo, canUndo, canRedo, reset };
};
