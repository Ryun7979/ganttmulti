import React, { useState, useMemo } from 'react';
import { Task, TaskOrGroup } from '../types';

interface UseTaskViewModelProps {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
}

export const useTaskViewModel = ({ tasks, setTasks }: UseTaskViewModelProps) => {
  const [groupBy, setGroupBy] = useState<'default' | 'assignee'>('default');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Drag Reordering State
  const [draggedTaskIndex, setDraggedTaskIndex] = useState<number | null>(null);
  const [draggingTasks, setDraggingTasks] = useState<Task[] | null>(null);

  // Selection State
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Selection Handlers
  const toggleTaskSelection = (taskId: string, multi: boolean, range: boolean) => {
    const newSelected = new Set(multi ? selectedTaskIds : []);

    if (range && lastSelectedId && lastSelectedId !== taskId) {
      // Range selection logic (simple implementation based on current list order)
      // Note: This relies on displayItems order. Ideally we should use the current sorted/filtered list.
      // For now, we'll try to find indices in the 'tasks' array as a fallback, 
      // but strictly speaking distinct 'view' indices are needed for correct visual range selection.
      // Since 'displayItems' includes groups, we need to extract tasks from it or just use 'tasks' if no grouping.

      // Attempting to use 'tasks' for range selection index finding
      const startIdx = tasks.findIndex(t => t.id === lastSelectedId);
      const endIdx = tasks.findIndex(t => t.id === taskId);

      if (startIdx !== -1 && endIdx !== -1) {
        const low = Math.min(startIdx, endIdx);
        const high = Math.max(startIdx, endIdx);
        for (let i = low; i <= high; i++) {
          newSelected.add(tasks[i].id);
        }
      } else {
        newSelected.add(taskId);
      }
    } else {
      // Toggle or Single select
      if (multi) {
        if (newSelected.has(taskId)) {
          newSelected.delete(taskId);
        } else {
          newSelected.add(taskId);
        }
      } else {
        // Single Click (No Modifier)
        const wasSelected = selectedTaskIds.has(taskId);
        newSelected.clear(); // Always clear others

        if (!wasSelected) {
          newSelected.add(taskId);
        }
        // If it was already selected, we leave it clear (Toggle Off)
      }
    }

    setSelectedTaskIds(newSelected);
    setLastSelectedId(taskId);
  };

  const selectTask = (taskId: string) => {
    setSelectedTaskIds(prev => {
      if (prev.has(taskId)) {
        // Include clearing logic if already selected (Toggle Off)
        return new Set();
      }
      return new Set([taskId]);
    });
    setLastSelectedId(taskId);
  };

  const addToSelection = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
    setLastSelectedId(taskId);
  };

  const clearSelection = () => {
    setSelectedTaskIds(new Set());
    setLastSelectedId(null);
  };


  // Group Collapsing
  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Derived Data
  const displayItems: TaskOrGroup[] = useMemo(() => {
    const source = draggingTasks || tasks;

    if (groupBy === 'default') {
      return source;
    }

    // Grouping Logic for Assignee
    const grouped = new Map<string, Task[]>();
    source.forEach(task => {
      const key = task.assignee || '未設定';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(task);
    });

    const result: TaskOrGroup[] = [];
    const sortedKeys = Array.from(grouped.keys()).sort((a, b) => {
      if (a === '未設定') return 1;
      if (b === '未設定') return -1;
      return a.localeCompare(b);
    });

    sortedKeys.forEach(key => {
      const groupId = `group-header-${key}`;
      const isCollapsed = collapsedGroups.has(groupId);

      const groupTasks = grouped.get(key)!;
      const totalTasks = groupTasks.length;
      const incompleteTasks = groupTasks.filter(t => t.progress < 100).length;

      // Add Group Header
      result.push({
        id: groupId,
        type: 'group',
        title: `${key} (${incompleteTasks}/${totalTasks})`,
        isCollapsed
      });

      // Add Tasks if not collapsed
      if (!isCollapsed) {
        result.push(...grouped.get(key)!);
      }
    });

    return result;
  }, [tasks, draggingTasks, groupBy, collapsedGroups]);

  // Reordering Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (groupBy !== 'default') { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = "move";
    setDraggingTasks([...tasks]);
    setTimeout(() => setDraggedTaskIndex(index), 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (groupBy !== 'default' || draggedTaskIndex === null || draggedTaskIndex === index) return;

    const newTasks = [...(draggingTasks || tasks)];
    const [item] = newTasks.splice(draggedTaskIndex, 1);
    newTasks.splice(index, 0, item);

    setDraggingTasks(newTasks);
    setDraggedTaskIndex(index);
  };

  const handleDragEnd = () => {
    if (draggingTasks) setTasks(draggingTasks);
    setDraggingTasks(null);
    setDraggedTaskIndex(null);
  };

  return {
    groupBy,
    setGroupBy,
    collapsedGroups,
    toggleGroup,
    displayItems,
    draggedTaskIndex,
    draggingTasks,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    selectedTaskIds,
    toggleTaskSelection,
    selectTask,
    addToSelection,
    clearSelection

  };
};