import { useState, useMemo } from 'react';
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
    handleDragEnd
  };
};