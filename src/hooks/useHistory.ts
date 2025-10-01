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
    setState(currentState => {
      if (newPresent === currentState.present) {
        return currentState;
      }
      return {
        past: [...currentState.past, currentState.present],
        present: newPresent,
        future: [],
      };
    });
  }, []);
  
  const reset = useCallback((newPresent: T) => {
     setState({
        past: [],
        present: newPresent,
        future: [],
    });
  }, []);

  return { state: state.present, set, undo, redo, canUndo, canRedo, reset };
};
