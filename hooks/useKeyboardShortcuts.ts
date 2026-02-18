import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
  undo: () => void;
  redo: () => void;
}

export const useKeyboardShortcuts = ({ undo, redo }: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Z')) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
};