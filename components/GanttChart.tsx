import React, { useRef, useEffect, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Task, TaskOrGroup, DragState, ViewMode, AppSettings } from '../types';
import { parseDate, diffDays, addDays, formatDate, VIEW_SETTINGS, generateTicks, isHoliday, isEvent, getPaletteColor, isWeekend, calculateWorkdays, calculateEndDate, addWorkdays, getPixelsPerDay, addTimeUnits } from '../utils';
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

  const pixelsPerDay = getPixelsPerDay(viewMode, settings.minDayUnit);

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
    const initialSnapshots: Record<string, { start: Date; end: Date; startTime?: 'AM' | 'PM'; endTime?: 'AM' | 'PM'; progress: number; workdays: number }> = {};
    tasksToDrag.forEach(t => {
      const s = parseDate(t.startDate);
      const e = parseDate(t.endDate);
      initialSnapshots[t.id] = {
        start: s,
        end: e,
        startTime: t.startTime,
        endTime: t.endTime,
        progress: t.progress,
        workdays: t.workdays ?? calculateWorkdays(s, e, settings, t.startTime, t.endTime)
      };
    });

    setDragState({
      isDragging: true,
      taskId: task.id,
      mode,
      initialX: e.clientX,
      originalStart: parseDate(task.startDate),
      originalEnd: parseDate(task.endDate),
      originalStartTime: task.startTime,
      originalEndTime: task.endTime,
      currentStart: parseDate(task.startDate),
      currentEnd: parseDate(task.endDate),
      currentStartTime: task.startTime,
      currentEndTime: task.endTime,
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
    // Calculate delta in fractional days (e.g. 0.5)
    // We don't round here because addTimeUnits handles stepping based on minDayUnit
    const deltaDays = deltaX / pixelsPerDay;

    let newStart = new Date(currentDragState.originalStart);
    let newEnd = new Date(currentDragState.originalEnd);
    let newStartTime = currentDragState.originalStartTime || 'AM';
    let newEndTime = currentDragState.originalEndTime || 'PM';

    if (currentDragState.mode === 'move') {
      const startResult = addTimeUnits(currentDragState.originalStart, currentDragState.originalStartTime || 'AM', deltaDays, settings.minDayUnit || 1);
      newStart = startResult.date;
      newStartTime = startResult.timing;

      const snapshot = currentDragState.initialSnapshots?.[currentDragState.taskId!];
      if (snapshot?.workdays) {
        // Recalculate end based on workdays from new start
        const endResult = calculateEndDate(newStart, snapshot.workdays, settings, newStartTime);
        newEnd = endResult.date;
        newEndTime = endResult.timing;
      } else {
        // Fallback (shouldn't happen for valid tasks)
        // Just shift end by same amount? Or default to keeping duration constant via date math?
        const endResult = addTimeUnits(currentDragState.originalEnd, currentDragState.originalEndTime || 'PM', deltaDays, settings.minDayUnit || 1);
        newEnd = endResult.date;
        newEndTime = endResult.timing;
      }
    } else if (currentDragState.mode === 'resize-left') {
      const startResult = addTimeUnits(currentDragState.originalStart, currentDragState.originalStartTime || 'AM', deltaDays, settings.minDayUnit || 1);
      newStart = startResult.date;
      newStartTime = startResult.timing;

      // Check boundaries? newStart <= newEnd
      // Note: newStart/newEnd interact with times. 
      // Simple check: formatDate(newStart) <= formatDate(newEnd)
      // More precise: 
      // if (newStart > newEnd) ... logic needed.
      // For now, simple date check.
      if (newStart > newEnd) newStart = newEnd;

    } else if (currentDragState.mode === 'resize-right') {
      const endResult = addTimeUnits(currentDragState.originalEnd, currentDragState.originalEndTime || 'PM', deltaDays, settings.minDayUnit || 1);
      newEnd = endResult.date;
      newEndTime = endResult.timing;

      if (newEnd < newStart) newEnd = newStart;
    }

    setDragState(prev => ({
      ...prev,
      currentStart: newStart,
      currentEnd: newEnd,
      currentStartTime: newStartTime,
      currentEndTime: newEndTime
    }));

  }, [pixelsPerDay, tasks, timelineStart, settings]);

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

      const isSameDay = startDiff === 0;
      const isSameTime = currentDragState.currentStartTime === currentDragState.originalStartTime;
      const hasMovedEffective = !isSameDay || !isSameTime;

      // Logic for Selection on Click (No Move)
      // If we didn't move effectively (hasMovedEffective === false), treating it as a click.
      // We only toggle selection here if modifiers weren't used (modifiers handled in MouseDown).
      if (!hasMovedEffective && currentDragState.mode === 'move' && onSelectTask) {
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
            if (s !== draggedTask.startDate || e !== draggedTask.endDate || currentDragState.currentStartTime !== draggedTask.startTime || currentDragState.currentEndTime !== draggedTask.endTime) {
              taskUpdates.startDate = s;
              taskUpdates.endDate = e;
              taskUpdates.startTime = currentDragState.currentStartTime;
              taskUpdates.endTime = currentDragState.currentEndTime;

              if (currentDragState.mode === 'resize-left' || currentDragState.mode === 'resize-right') {
                const newWorkdays = calculateWorkdays(
                  currentDragState.currentStart,
                  currentDragState.currentEnd,
                  settings,
                  currentDragState.currentStartTime || 'AM',
                  currentDragState.currentEndTime || 'PM'
                );
                taskUpdates.workdays = newWorkdays;
              }
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
          if (currentDragState.mode === 'move' && hasMovedEffective) {
            // Need to calculate DELTA from original to current for the MAIN task
            // Then apply that delta to others.
            // Wait, calculateEndDate uses workdays.
            // If I move the main task 0.5 days.
            // Other tasks should move 0.5 days.
            // I should convert startDiff (days) to `units`.
            // startDiff calculation above is just Date diff, it loses timing info.

            // Recalculate precise delta
            const deltaX = (currentDragState.initialX !== undefined) ? (dragStateRef.current.initialX - currentDragState.initialX) : 0; // Wait, currentDragState IS the ref.
            // Actually, we have currentDragState.currentStart and originalStart.
            // But simpler: just use the offset we calculated in MouseMove logic for the main task?
            // No, we need to apply it to each snapshot.

            // Let's use `deltaDays` from pixels.
            // But we don't have `e.clientX` here.
            // We can derive valid `deltaDays` from main task change.
            // Main task changed from `originalStart` + `originalStartTime` to `currentStart` + `currentStartTime`.

            // Rough approximation:
            // days = diffDays(currentStart, originalStart).
            // timeDiff = (currentStartTime === 'PM' ? 0.5 : 0) - (originalStartTime === 'PM' ? 0.5 : 0).
            // totalDelta = days + timeDiff.

            let totalDelta = diffDays(currentDragState.currentStart!, currentDragState.originalStart);
            const t1 = (currentDragState.currentStartTime === 'PM' ? 0.5 : 0);
            const t0 = (currentDragState.originalStartTime === 'PM' ? 0.5 : 0);
            totalDelta += (t1 - t0);

            Object.entries(currentDragState.initialSnapshots).forEach(([tId, snapshot]) => {
              const t = tasks.find(x => x.id === tId);
              if (t) {
                // Apply totalDelta to this snapshot
                const newStartObj = addTimeUnits(snapshot.start, snapshot.startTime || 'AM', totalDelta, settings.minDayUnit || 1);

                let newEndObj;
                if (snapshot.workdays) {
                  newEndObj = calculateEndDate(newStartObj.date, snapshot.workdays, settings, newStartObj.timing);
                } else {
                  newEndObj = addTimeUnits(snapshot.end, snapshot.endTime || 'PM', totalDelta, settings.minDayUnit || 1);
                }

                updates.push({
                  ...t,
                  startDate: formatDate(newStartObj.date),
                  startTime: newStartObj.timing,
                  endDate: formatDate(newEndObj.date),
                  endTime: newEndObj.timing
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
        currentStartTime: undefined,
        currentEndTime: undefined,
        currentProgress: undefined,
        initialSnapshots: undefined
      }));
    }
  }, [tasks, onTaskUpdate, onTasksUpdate, onSelectTask, settings]);

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

  const totalWidth = useMemo(() => {
    return ticks.reduce((acc, _, i) => acc + getTickWidth(i), 0);
  }, [ticks, pixelsPerDay]);

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
      <div className="relative" style={{ minWidth: totalWidth }}>
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
            ? addWorkdays(currentS, snap.workdays, settings)
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
            const isMilestone = task.type === 'milestone';
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
                ? addWorkdays(displayStart, snap.workdays, settings)
                : addDays(snap.end, startDelta);
              // progress doesn't change on move
            } else if (isDraggingThis) {
              // Fallback / Rename / Resize
              if (dragState.currentStart) displayStart = dragState.currentStart;
              if (dragState.currentEnd) displayEnd = dragState.currentEnd;
              if (dragState.currentStartTime) task.startTime = dragState.currentStartTime; // Temporary override for display calculation? 
              // Better to use a local variable for display
              // displayStartTime = ...
              if (dragState.currentProgress !== undefined) displayProgress = dragState.currentProgress;
            }

            const isCompleted = displayProgress === 100;

            const assigneeIndex = uniqueAssignees.indexOf(task.assignee || '');
            const assigneeColor = getPaletteColor(assigneeIndex, settings.assigneePalette);

            const displayStartTime = (dragState.isDragging && dragState.taskId === task.id) ? dragState.currentStartTime : (task.startTime || 'AM');
            const displayEndTime = (dragState.isDragging && dragState.taskId === task.id) ? dragState.currentEndTime : (task.endTime || 'PM');

            let displayWorkdays = task.workdays;
            if (isDraggingThis && (dragState.mode === 'resize-left' || dragState.mode === 'resize-right')) {
              displayWorkdays = calculateWorkdays(displayStart, displayEnd, settings, displayStartTime, displayEndTime);
            }

            const startDiff = diffDays(displayStart, timelineStart);
            const rawDuration = diffDays(displayEnd, displayStart) + 1;
            const duration = Math.max(0.5, rawDuration - (displayStartTime === 'PM' ? 0.5 : 0) - (displayEndTime === 'AM' ? 0.5 : 0));
            const offset = (displayStartTime === 'PM') ? 0.5 : 0;
            const style = {
              left: `${(startDiff + offset) * pixelsPerDay}px`,
              width: `${duration * pixelsPerDay}px`
            };

            if (isMilestone) {
              const startDiff = diffDays(displayStart, timelineStart);
              const style = {
                left: `${(startDiff + 1) * pixelsPerDay}px`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
              };

              return (
                <div
                  key={task.id}
                  className={`h-12 border-b border-gray-100 relative group transition-colors hover:bg-white/50`}
                >
                  <div
                    className={`absolute z-10 cursor-grab hover:scale-110 transition-transform ${isDraggingThis ? 'cursor-grabbing scale-125' : ''}`}
                    style={style}
                    onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onEditTask(task);
                    }}
                  >
                    <div className="relative flex items-center justify-center">
                      <div
                        style={{ color: assigneeColor.bar }}
                        className="text-lg leading-none"
                      >
                        ▼
                      </div>
                      <div
                        className="absolute left-full ml-1 text-xs font-semibold whitespace-nowrap px-1 rounded bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100"
                        style={{ color: assigneeColor.bar, top: '50%', transform: 'translateY(-50%)' }}
                      >
                        {task.name} ({displayStart.getMonth() + 1}/{displayStart.getDate()})
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

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

                  {/* Use a flex container for content to the right of the bar */}
                  <div
                    className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-medium text-gray-700 pointer-events-none flex items-center gap-2"
                  >
                    <span>{displayProgress}%</span>
                    <span>{task.name}</span>
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
