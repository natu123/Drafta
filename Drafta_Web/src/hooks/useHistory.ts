"use client";

import { useReducer, useCallback } from 'react';

// A reducer action
type Action<T> =
  | { type: 'SET'; newPresent: T }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET'; newPresent: T };

// The state of our history
type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

const historyReducer = <T>(state: HistoryState<T>, action: Action<T>): HistoryState<T> => {
  const { past, present, future } = state;

  switch (action.type) {
    case 'SET':
      const { newPresent } = action;
      if (newPresent === present) {
        return state;
      }
      return {
        past: [...past, present],
        present: newPresent,
        future: [],
      };
    case 'UNDO':
      if (past.length === 0) {
        return state;
      }
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
      };
    case 'REDO':
      if (future.length === 0) {
        return state;
      }
      const next = future[0];
      const newFuture = future.slice(1);
      return {
        past: [...past, present],
        present: next,
        future: newFuture,
      };
    case 'RESET':
        return {
            past: [],
            present: action.newPresent,
            future: [],
        };
    default:
      return state;
  }
};

export const useHistory = <T,>(initialPresent: T) => {
  const [state, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initialPresent,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const set = useCallback((newPresent: T) => {
    dispatch({ type: 'SET', newPresent });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const reset = useCallback((newPresent: T) => {
    dispatch({ type: 'RESET', newPresent });
  }, []);


  return {
    state: state.present,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  };
};