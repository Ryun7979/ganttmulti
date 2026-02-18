import { useState, useEffect } from 'react';
import { Task, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../utils';
import { useUndoRedo } from '../useUndoRedo';

const INITIAL_TASKS: Task[] = [
  // Fallback initial data if storage is empty
  // (Ideally this could be imported or defined elsewhere, but kept here for the hook's context)
];

const STORAGE_KEY = 'ganttgroove-storage-v1';
const SETTINGS_STORAGE_KEY = 'ganttgroove-settings-v1';

export const useAppPersistence = (defaultTasks: Task[]) => {
  // Task State with Undo/Redo
  const taskManager = useUndoRedo<Task[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load tasks:', e);
      }
    }
    return defaultTasks;
  });

  // Settings State
  const [settings, setAppSettings] = useState<AppSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (saved) {
           const parsed = JSON.parse(saved);
           return { ...DEFAULT_SETTINGS, ...parsed };
        }
      } catch (e) { console.error(e); }
    }
    return DEFAULT_SETTINGS;
  });

  // Persistence Effects
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(taskManager.state));
    } catch (e) {
      console.error('Failed to save tasks:', e);
    }
  }, [taskManager.state]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) { console.error('Failed to save settings:', e); }
  }, [settings]);

  return {
    tasks: taskManager.state,
    setTasks: taskManager.setState,
    undo: taskManager.undo,
    redo: taskManager.redo,
    canUndo: taskManager.canUndo,
    canRedo: taskManager.canRedo,
    settings,
    setAppSettings
  };
};