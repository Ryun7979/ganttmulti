import React, { useRef, useEffect, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Task, TaskOrGroup, DragState, ViewMode, AppSettings } from '../types';
import { parseDate, diffDays, addDays, formatDate, VIEW_SETTINGS, generateTicks, isHoliday, isEvent, getPaletteColor, isWeekend, calculateWorkdays, addWorkdays } from '../utils';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';

interface GanttChartProps {
  items: TaskOrGroup[];
  timelineStart: Date;
  timelineEnd: Date;
  viewMode: ViewMode;
  settings: AppSettings;
  onTaskUpdate: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onTasksUpdate?: (tasks: Task[]) => void;
  onToggleGroup?: (groupId: string) => void;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  selectedTaskIds?: Set<string>;
  onToggleSelection?: (taskId: string, multi: boolean, range: boolean) => void;
  onSelectTask?: (taskId: string) => void;
}

export const GanttChart = forwardRef<HTMLDivElement, GanttChartProps>(({
  items,
  timelineStart,
  timelineEnd,
  viewMode,
  settings,
  onTaskUpdate,
  onTasksUpdate,
  onEditTask,
  onToggleGroup,
  onScroll,
  selectedTaskIds,
  onToggleSelection,
  onSelectTask,
}, ref) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => chartRef.current!);

  const tasks = useMemo(() => items.filter((i): i is Task => !('type' in i && i.type === 'group')), [items]);

  const uniqueAssignees = useMemo(() => {
    const s = new Set<string>();
    tasks.forEach(t => s.add(t.assignee || ''));
    return Array.from(s).sort();
  }, [tasks]);

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    taskId: null,
    mode: null,
    initialX: 0,
    originalStart: new Date(),
    originalEnd: new Date(),
  });

  const pixelsPerDay = VIEW_SETTINGS[viewMode].pixelsPerDay;

  const ticks = useMemo(() => {
    return generateTicks(timelineStart, timelineEnd, viewMode);
  }, [timelineStart, timelineEnd, viewMode]);

  const handleMouseDown = (e: React.MouseEvent, task: Task, mode: DragState['mode']) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    const isMulti = e.ctrlKey || e.metaKey;
    const isRange = e.shiftKey;
    const isSelected = selectedTaskIds?.has(task.id);

    // Selection Logic
    if (mode === 'move') {
      if (isMulti || isRange) {
        onToggleSelection?.(task.id, isMulti, isRange);
        return; // Skip drag start if modifying selection
      }
      // Note: We do NOT select immediately if clicking an unselected task.
      // We wait to see if it's a click or a drag.
    }

    // Determine tasks to drag
    // If we are moving and the task is selected, we move all selected tasks.
    // Otherwise (or if not moving), we only affect the current task.
    let tasksToDrag: Task[] = [];
    if (mode === 'move') {
      if (isSelected && selectedTaskIds) {
        tasksToDrag = tasks.filter(t => selectedTaskIds.has(t.id));
      } else {
        tasksToDrag = [task];
      }
    } else {
      tasksToDrag = [task];
    }

    // Create snapshots for all dragging tasks
    const initialSnapshots: Record<string, { start: Date; end: Date; progress: number; workdays: number }> = {};
    tasksToDrag.forEach(t => {
      const s = parseDate(t.startDate);
      const e = parseDate(t.endDate);
      initialSnapshots[t.id] = {
        start: s,
        end: e,
        progress: t.progress,
        workdays: calculateWorkdays(s, e, settings.customHolidays)
      };
    });

    setDragState({
      isDragging: true,
      taskId: task.id,
      mode,
      initialX: e.clientX,
      originalStart: parseDate(task.startDate),
      originalEnd: parseDate(task.endDate),
      currentStart: parseDate(task.startDate),
      currentEnd: parseDate(task.endDate),
      currentProgress: task.progress,
      initialSnapshots
    });
  };

  const dragStateRef = useRef(dragState);
  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const currentDragState = dragStateRef.current;
    if (!currentDragState.isDragging || !currentDragState.taskId) return;

    if (currentDragState.mode === 'change-progress') {
      if (!chartRef.current) return;
      const task = tasks.find(t => t.id === currentDragState.taskId);
      if (!task) return;

      const chartRect = chartRef.current.getBoundingClientRect();
      const scrollLeft = chartRef.current.scrollLeft;

      const taskStart = currentDragState.originalStart;
      const startOffsetDays = diffDays(taskStart, timelineStart);
      const taskLeftPx = startOffsetDays * pixelsPerDay;
      const taskDuration = diffDays(currentDragState.originalEnd, taskStart) + 1;
      const taskWidthPx = taskDuration * pixelsPerDay;

      const mouseXInContent = e.clientX - chartRect.left + scrollLeft;
      const relativeX = mouseXInContent - taskLeftPx;

      let newProgress = Math.round((relativeX / taskWidthPx) * 100);
      newProgress = Math.max(0, Math.min(100, newProgress));

      setDragState(prev => ({
        ...prev,
        currentProgress: newProgress
      }));
      return;
    }

    const deltaX = e.clientX - currentDragState.initialX;
    const deltaDays = Math.round(deltaX / pixelsPerDay);

    let newStart = new Date(currentDragState.originalStart);
    let newEnd = new Date(currentDragState.originalEnd);

    if (currentDragState.mode === 'move') {
      newStart = addDays(currentDragState.originalStart, deltaDays);

      const snapshot = currentDragState.initialSnapshots?.[currentDragState.taskId!];
      if (snapshot?.workdays) {
        newEnd = addWorkdays(newStart, snapshot.workdays, settings.customHolidays);
      } else {
        newEnd = addDays(currentDragState.originalEnd, deltaDays);
      }
    } else if (currentDragState.mode === 'resize-left') {
      newStart = addDays(currentDragState.originalStart, deltaDays);
      if (newStart > newEnd) newStart = newEnd;
    } else if (currentDragState.mode === 'resize-right') {
      newEnd = addDays(currentDragState.originalEnd, deltaDays);
      if (newEnd < newStart) newEnd = newStart;
    }

    setDragState(prev => ({
      ...prev,
      currentStart: newStart,
      currentEnd: newEnd
    }));

  }, [pixelsPerDay, tasks, timelineStart]);

  const handleMouseUp = useCallback(() => {
    const currentDragState = dragStateRef.current;
    if (currentDragState.isDragging && currentDragState.taskId) {
      const draggedTask = tasks.find(t => t.id === currentDragState.taskId);

      // Check if it was a simple click (interaction but no movement)
      const hasMoved = currentDragState.initialX !== undefined && Math.abs((dragState.initialX || 0) - currentDragState.initialX) > 5;

      // Calculate delta days for bulk move
      const startDiff = (currentDragState.currentStart && currentDragState.originalStart)
        ? diffDays(currentDragState.currentStart, currentDragState.originalStart)
        : 0;

      // Logic for Selection on Click (No Move)
      // If we didn't move effectively (startDiff === 0), treating it as a click.
      // We only toggle selection here if modifiers weren't used (modifiers handled in MouseDown).
      if (startDiff === 0 && currentDragState.mode === 'move' && onSelectTask) {
        // If it was a clean click without move, select this task.
        onSelectTask(currentDragState.taskId);
      }


      if (draggedTask) {
        const updates: Task[] = [];

        // Single Task Update (Resize / Progress) OR Bulk Move fallback
        if (!currentDragState.initialSnapshots || Object.keys(currentDragState.initialSnapshots).length <= 1) {
          let taskUpdates: Partial<Task> = {};
          let hasChanges = false;

          if (currentDragState.currentStart && currentDragState.currentEnd) {
            const s = formatDate(currentDragState.currentStart);
            const e = formatDate(currentDragState.currentEnd);
            if (s !== draggedTask.startDate || e !== draggedTask.endDate) {
              taskUpdates.startDate = s;
              taskUpdates.endDate = e;
              hasChanges = true;
            }
          }

          if (currentDragState.currentProgress !== undefined && currentDragState.currentProgress !== draggedTask.progress) {
            taskUpdates.progress = currentDragState.currentProgress;
            hasChanges = true;
          }

          if (hasChanges) {
            updates.push({ ...draggedTask, ...taskUpdates });
          }
        } else {
          // Bulk Move
          if (currentDragState.mode === 'move' && startDiff !== 0) {
            Object.entries(currentDragState.initialSnapshots).forEach(([tId, snapshot]) => {
              const t = tasks.find(x => x.id === tId);
              if (t) {
                const newS = addDays(snapshot.start, startDiff);
                const newE = snapshot.workdays
                  ? addWorkdays(newS, snapshot.workdays, settings.customHolidays)
                  : addDays(snapshot.end, startDiff);

                updates.push({
                  ...t,
                  startDate: formatDate(newS),
                  endDate: formatDate(newE)
                });
              }
            });
          }
        }

        if (updates.length > 0) {
          if (onTasksUpdate) {
            onTasksUpdate(updates);
          } else {
            // Fallback for single update
            onTaskUpdate(updates[0]);
          }
        }
      }

      setDragState(prev => ({
        ...prev,
        isDragging: false,
        taskId: null,
        mode: null,
        currentStart: undefined,
        currentEnd: undefined,
        currentProgress: undefined,
        initialSnapshots: undefined
      }));
    }
  }, [tasks, onTaskUpdate, onTasksUpdate, onSelectTask]);

  useEffect(() => {
    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  const getTickWidth = (index: number) => {
    if (index >= ticks.length - 1) return 100;
    return diffDays(ticks[index + 1], ticks[index]) * pixelsPerDay;
  };

  const checkHoliday = (date: Date) => isHoliday(date, settings.customHolidays);
  const checkEvent = (date: Date) => isEvent(date, settings.customEvents);

  return (
    <div
      className="relative flex-1 overflow-auto hide-scrollbar select-none"
      ref={chartRef}
      onScroll={onScroll}
    >
      {/* Header Dates */}
      <div className="flex border-b border-gray-200 sticky top-0 bg-gray-50 z-20 h-10 min-w-max">
        {ticks.map((date, i) => {
          const isHol = checkHoliday(date);
          const isEvt = checkEvent(date);
          const isWe = isWeekend(date);
          const isSpecial = isHol || (viewMode === 'Day' && isWe);

          // Determine styles based on priority: Event > Holiday > Default
          let bg = undefined;
          let dateTextColor = '#6b7280';
          let weekdayTextColor = '#9ca3af';

          if (isEvt) {
            // Fallback for missing eventColors (backward compat)
            const colors = settings.eventColors || { headerBg: '#fef9c3', dateText: '#ca8a04', weekdayText: '#eab308' };
            bg = colors.headerBg;
            dateTextColor = colors.dateText;
            weekdayTextColor = colors.weekdayText;
          } else if (isSpecial) {
            bg = settings.holidayColors.headerBg;
            dateTextColor = settings.holidayColors.dateText;
            weekdayTextColor = settings.holidayColors.weekdayText;
          }

          return (
            <div
              key={i}
              className={`flex-shrink-0 border-r border-gray-200 flex flex-col items-center justify-center text-xs font-medium uppercase truncate px-1`}
              style={{
                width: `${getTickWidth(i)}px`,
                backgroundColor: bg,
                color: dateTextColor
              }}
            >
              {viewMode === 'Day' && (
                <>
                  <span style={{ color: dateTextColor }}>
                    {date.getDate() === 1 ? `${date.getMonth() + 1}/${date.getDate()}` : date.getDate()}
                  </span>
                  <span style={{ fontSize: '10px', color: weekdayTextColor }}>
                    {date.toLocaleDateString('ja-JP', { weekday: 'narrow' })}
                  </span>
                </>
              )}
              {viewMode === 'Week' && (
                <span>
                  {date.getMonth() + 1}/{date.getDate()} -
                </span>
              )}
              {viewMode === 'Month' && (
                <span>{date.getFullYear()}年 {date.getMonth() + 1}月</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Grid & Tasks */}
      <div className="relative min-w-max">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex pointer-events-none z-0">
          {ticks.map((date, i) => {
            const isHol = checkHoliday(date);
            const isEvt = checkEvent(date);
            const isWe = isWeekend(date);
            const isSpecial = isHol || (viewMode === 'Day' && isWe);

            let bg = undefined;
            if (isEvt) {
              bg = settings.eventColors?.gridBg || '#fefce8';
            } else if (isSpecial) {
              bg = settings.holidayColors.gridBg;
            }

            return (
              <div
                key={i}
                className="flex-shrink-0 border-r border-gray-100 h-full"
                style={{
                  width: `${getTickWidth(i)}px`,
                  backgroundColor: bg
                }}
              />
            );
          })}
        </div>

        {/* Timeline Drop Highlight */}
        {dragState.isDragging && dragState.mode === 'move' && dragState.initialSnapshots && Object.entries(dragState.initialSnapshots).map(([id, snap]) => {
          // Calculate current positions based on delta
          const startDelta = diffDays(dragState.currentStart!, dragState.originalStart);
          const currentS = addDays(snap.start, startDelta);
          const currentE = snap.workdays
            ? addWorkdays(currentS, snap.workdays, settings.customHolidays)
            : addDays(snap.end, startDelta);

          return (
            <div key={id} className="absolute inset-0 z-0 pointer-events-none">
              <div
                className="absolute top-0 bottom-0 bg-blue-400/10 border-l border-r border-blue-400/50"
                style={{
                  left: `${diffDays(currentS, timelineStart) * pixelsPerDay}px`,
                  width: `${(diffDays(currentE, currentS) + 1) * pixelsPerDay}px`
                }}
              />
            </div>
          );
        })}

        {/* Rows */}
        <div className="relative z-10">
          {items.map((item) => {
            if ('type' in item && item.type === 'group') {
              return (
                <div
                  key={item.id}
                  className="h-8 bg-gray-50 border-b border-gray-200 w-full relative flex items-center hover:bg-gray-100/50 transition-colors cursor-pointer"
                  onClick={() => onToggleGroup && onToggleGroup(item.id)}
                >
                  <div className="sticky left-0 px-2 text-gray-300">
                    {item.isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>
              );
            }

            const task = item as Task;
            const isDraggingThis = dragState.isDragging && dragState.taskId === task.id;
            const isSelected = selectedTaskIds?.has(task.id);

            // Display values calculation
            let displayStart = parseDate(task.startDate);
            let displayEnd = parseDate(task.endDate);
            let displayProgress = task.progress;

            // If dragging, override display values for ALL moving tasks
            if (dragState.isDragging && dragState.mode === 'move' && dragState.initialSnapshots && dragState.initialSnapshots[task.id]) {
              const snap = dragState.initialSnapshots[task.id];
              const startDelta = diffDays(dragState.currentStart!, dragState.originalStart);
              displayStart = addDays(snap.start, startDelta);
              displayEnd = snap.workdays
                ? addWorkdays(displayStart, snap.workdays, settings.customHolidays)
                : addDays(snap.end, startDelta);
              // progress doesn't change on move
            } else if (isDraggingThis) {
              // Fallback / Rename / Resize
              if (dragState.currentStart) displayStart = dragState.currentStart;
              if (dragState.currentEnd) displayEnd = dragState.currentEnd;
              if (dragState.currentProgress !== undefined) displayProgress = dragState.currentProgress;
            }

            const isCompleted = displayProgress === 100;

            const assigneeIndex = uniqueAssignees.indexOf(task.assignee || '');
            const assigneeColor = getPaletteColor(assigneeIndex, settings.assigneePalette);

            const startDiff = diffDays(displayStart, timelineStart);
            const duration = diffDays(displayEnd, displayStart) + 1;
            const style = {
              left: `${startDiff * pixelsPerDay}px`,
              width: `${duration * pixelsPerDay}px`
            };

            return (
              <div
                key={task.id}
                className={`h-12 border-b border-gray-100 relative group transition-colors 
                  ${isCompleted && !isDraggingThis ? 'bg-gray-100' : 'hover:bg-white/50'}
                `}
              >
                {/* Phantom Box for Dragging - Only show for the primary dragged item to avoid clutter? Or show for all? 
                    Showing for all selected tasks if they are being bulk moved. 
                */}
                {dragState.isDragging && dragState.mode === 'move' && dragState.initialSnapshots?.[task.id] && (
                  <div
                    className="absolute top-2 h-8 rounded-md border-2 border-dashed border-gray-300 bg-gray-50/50 z-0"
                    style={{
                      left: `${diffDays(parseDate(task.startDate), timelineStart) * pixelsPerDay}px`,
                      width: `${(diffDays(parseDate(task.endDate), parseDate(task.startDate)) + 1) * pixelsPerDay}px`
                    }}
                  />
                )}

                <div
                  className={`absolute top-2 h-8 rounded-md shadow-sm flex items-center group-task select-none transition-none
                    ${isDraggingThis && dragState.mode === 'move' ? 'cursor-grabbing ring-2 ring-blue-400 shadow-xl z-30 opacity-95' : 'cursor-grab hover:shadow-md z-10 transition-colors duration-300'}
                    ${isSelected ? 'ring-2 ring-blue-500 z-20 shadow-md' : ''}
                  `}
                  style={{
                    ...style,
                    backgroundColor: isCompleted ? '#f3f4f6' : assigneeColor.bg,
                    borderColor: isSelected ? '#3b82f6' : (isCompleted ? '#9ca3af' : assigneeColor.border),
                    borderWidth: isSelected ? '2px' : '1px'
                  }}
                  onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onEditTask(task);
                  }}
                >
                  <div
                    className={`h-full rounded-l-md transition-colors duration-300`}
                    style={{
                      width: `${displayProgress}%`,
                      backgroundColor: isCompleted ? '#6b7280' : assigneeColor.bar
                    }}
                  />

                  <div
                    className={`absolute top-0 bottom-0 w-6 -ml-3 cursor-ew-resize z-40 flex items-center justify-center transition-opacity
                      ${isDraggingThis && dragState.mode === 'change-progress' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                    `}
                    style={{ left: `${displayProgress}%` }}
                    onMouseDown={(e) => handleMouseDown(e, task, 'change-progress')}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-1.5 h-4 bg-white rounded-full shadow-md ring-1 ring-gray-300 transform transition-transform hover:scale-110 active:scale-125" />
                  </div>

                  <div className="absolute inset-0 flex items-center px-2 pointer-events-none overflow-hidden">
                    <span
                      className="text-xs font-semibold truncate flex items-center"
                      style={{ color: isCompleted ? '#e5e7eb' : (displayProgress > 50 ? assigneeColor.textColor : '#374151') }}
                    >
                      {isCompleted && (
                        <Check size={14} className="mr-1 animate-pop-in" strokeWidth={3} />
                      )}
                      {task.name} ({displayProgress}%)
                    </span>
                  </div>

                  <div
                    className="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize hover:bg-black/10 rounded-l-md transition-colors z-20"
                    onMouseDown={(e) => handleMouseDown(e, task, 'resize-left')}
                  />

                  <div
                    className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize hover:bg-black/10 rounded-r-md transition-colors z-20"
                    onMouseDown={(e) => handleMouseDown(e, task, 'resize-right')}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

GanttChart.displayName = 'GanttChart';
