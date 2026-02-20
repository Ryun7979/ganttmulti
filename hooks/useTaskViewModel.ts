import React, { useState, useMemo, useRef } from 'react';
import { Task, TaskOrGroup, AppSettings } from '../types';
import { calculateWorkdays, parseDate } from '../utils';

interface UseTaskViewModelProps {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  settings: AppSettings;
}

export const useTaskViewModel = ({ tasks, setTasks, settings }: UseTaskViewModelProps) => {
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

      const groupWorkdays = groupTasks.reduce((acc, task) => {
        if (task.workdays !== undefined) {
          return acc + task.workdays;
        }
        return acc + calculateWorkdays(
          parseDate(task.startDate),
          parseDate(task.endDate),
          settings,
          task.startTime,
          task.endTime
        );
      }, 0);

      // Add Group Header
      result.push({
        id: groupId,
        type: 'group',
        title: `${key} (${incompleteTasks}/${totalTasks}) - ${groupWorkdays}日`,
        isCollapsed
      });

      // Add Tasks if not collapsed
      if (!isCollapsed) {
        result.push(...grouped.get(key)!);
      }
    });

    return result;
  }, [tasks, draggingTasks, groupBy, collapsedGroups, settings]);

  // Reordering Handlers
  // Reordering Handlers
  const [draggingTaskIds, setDraggingTaskIds] = useState<Set<string> | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (groupBy !== 'default') { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = "move";

    const task = tasks[index];
    let newDraggingIds = new Set<string>();

    // If dragging a selected task, drag all selected tasks
    // If dragging an unselected task, drag only that task (and keep selection as is? or update selection?)
    // Decision: If unselected, drag just that one.
    if (selectedTaskIds.has(task.id)) {
      newDraggingIds = new Set(selectedTaskIds);
    } else {
      newDraggingIds = new Set([task.id]);
    }

    setDraggingTaskIds(newDraggingIds);
    setDraggingTasks([...tasks]);
    setTimeout(() => setDraggedTaskIndex(index), 0);
  };

  // Throttling for drag over
  const lastDragOverTime = useRef(0);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const now = Date.now();
    if (now - lastDragOverTime.current < 50) return; // 50ms throttle
    lastDragOverTime.current = now;

    if (groupBy !== 'default' || draggedTaskIndex === null || !draggingTasks || !draggingTaskIds) return;

    const targetItem = draggingTasks[index];
    // If hovering over one of the dragged items, do nothing
    if (draggingTaskIds.has(targetItem.id)) return;

    // Filter out dragged items from the list to find the "gap"
    const newItems = draggingTasks.filter(t => !draggingTaskIds.has(t.id));

    // Find where the target item is in the new list (without dragged items)
    const targetIndexInNew = newItems.findIndex(t => t.id === targetItem.id);
    if (targetIndexInNew === -1) return; // Should not happen

    // Identify items to move (in their original relative order? or current order in draggingTasks?)
    // Using draggingTasks ensures we keep them together if they were already grouped, 
    // but initially they might be scattered. 
    // If scattered, we probably want to group them.
    // Let's filter from draggingTasks to keep their *current* order if they are already moving?
    // Actually, on first dragOver they might be scattered.
    // If we use draggingTasks.filter, we get them in order of appearance in the list.
    const itemsToMove = draggingTasks.filter(t => draggingTaskIds.has(t.id));

    // Insert items at the target index
    // Using splice to insert *before* the target item?
    // If moving down, targetIndexInNew is correctly pointing to the item we want to be *after* (visually)?
    // Standard reorder logic:
    // If dragging index < target index, insert after?
    // But since we removed items, indices shift.
    // `targetIndexInNew` is the index of the item we are hovering over, in the *compacted* list.
    // We want to insert *before* this item usually.
    newItems.splice(targetIndexInNew, 0, ...itemsToMove);

    setDraggingTasks(newItems);

    // Update draggedTaskIndex to point to the new location of the primary dragged item?
    // We need it to keep the "ghost" effectively positioned?
    // Actually, simply finding the new index of the *first* moved item is enough to keep `draggedTaskIndex` valid-ish
    // so that we don't clear state inadvertently.
    const newPrimaryIndex = newItems.findIndex(t => t.id === itemsToMove[0].id);
    setDraggedTaskIndex(newPrimaryIndex);
  };

  const handleDragEnd = () => {
    if (draggingTasks) setTasks(draggingTasks);
    setDraggingTasks(null);
    setDraggingTaskIds(null);
    setDraggedTaskIndex(null);
  };

  return {
    groupBy,
    setGroupBy,
    collapsedGroups,
    toggleGroup,
    displayItems,
    draggedTaskIndex, // Legacy single index, mostly for compatibility or if needed
    draggingTasks,
    draggingTaskIds, // Exported for UI
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