import React, { useRef, useEffect, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Task, TaskOrGroup, DragState, ViewMode, AppSettings, ColorSet } from '../types';
import { parseDate, diffDays, addDays, formatDate, VIEW_SETTINGS, generateTicks, isHoliday, isEvent, getPaletteColor, isWeekend, calculateWorkdays, calculateEndDate, addWorkdays, getPixelsPerDay, addTimeUnits } from '../utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

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

// -------------------------------------------------------------------------
// Sub-components (Memoized)
// -------------------------------------------------------------------------

const GanttHeader = React.memo(({ ticks, viewMode, settings, getTickWidth }: { ticks: Date[], viewMode: ViewMode, settings: AppSettings, getTickWidth: (i: number) => number }) => {
  const checkHoliday = (date: Date) => isHoliday(date, settings.customHolidays);
  const checkEvent = (date: Date) => isEvent(date, settings.customEvents);

  return (
    <div className="flex border-b border-gray-200 sticky top-0 bg-gray-50 z-20 h-10 min-w-max">
      {ticks.map((date, i) => {
        const isHol = checkHoliday(date);
        const isEvt = checkEvent(date);
        const isWe = isWeekend(date);
        const isSpecial = isHol || (viewMode === 'Day' && isWe);

        let bg = undefined;
        let dateTextColor = '#6b7280';
        let weekdayTextColor = '#9ca3af';

        if (isEvt) {
          const colors = settings.eventColors || { headerBg: '#fef9c3', dateText: '#ca8a04', weekdayText: '#eab308' };
          bg = colors.headerBg;
          dateTextColor = colors.dateText;
          weekdayTextColor = colors.weekdayText;
        } else if (isSpecial) {
          bg = settings.holidayColors.headerBg;
          dateTextColor = settings.holidayColors.dateText;
          weekdayTextColor = settings.holidayColors.weekdayText;
        }

        const tickWidth = getTickWidth(i);

        return (
          <div
            key={date.toISOString()}
            className={`flex-shrink-0 border-r border-gray-200 flex flex-col items-center justify-center text-xs font-medium uppercase truncate px-1`}
            style={{
              width: `${tickWidth}px`,
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
  );
});

const GanttBackground = React.memo(({ ticks, viewMode, settings, getTickWidth }: { ticks: Date[], viewMode: ViewMode, settings: AppSettings, getTickWidth: (i: number) => number }) => {
  const checkHoliday = (date: Date) => isHoliday(date, settings.customHolidays);
  const checkEvent = (date: Date) => isEvent(date, settings.customEvents);

  return (
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
            key={`grid-${date.toISOString()}`}
            className="flex-shrink-0 border-r border-gray-100 h-full"
            style={{
              width: `${getTickWidth(i)}px`,
              backgroundColor: bg
            }}
          />
        );
      })}
    </div>
  );
});

interface TaskItemProps {
  task: Task;
  settings: AppSettings;
  pixelsPerDay: number;
  timelineStart: Date;
  assigneeColor: ColorSet;
  isDraggingThis: boolean;
  isSelected: boolean;
  dragMode: DragState['mode'];
  dragValues?: {
    start?: Date;
    end?: Date;
    startTime?: 'AM' | 'PM';
    endTime?: 'AM' | 'PM';
    progress?: number;
    workdays?: number;
  };
  onMouseDown: (e: React.MouseEvent, task: Task, mode: DragState['mode']) => void;
  onEditTask: (task: Task) => void;
}

const TaskItem = React.memo(({
  task, settings, pixelsPerDay, timelineStart, assigneeColor,
  isDraggingThis, isSelected, dragMode, dragValues,
  onMouseDown, onEditTask
}: TaskItemProps) => {

  let displayStart = parseDate(task.startDate);
  let displayEnd = parseDate(task.endDate);
  let displayProgress = task.progress;
  let displayStartTime = task.startTime || 'AM';
  let displayEndTime = task.endTime || 'PM';

  // Apply Drag Overrides
  if (dragValues) {
    if (dragValues.start) displayStart = dragValues.start;
    if (dragValues.end) displayEnd = dragValues.end;
    if (dragValues.progress !== undefined) displayProgress = dragValues.progress;
    if (dragValues.startTime) displayStartTime = dragValues.startTime;
    if (dragValues.endTime) displayEndTime = dragValues.endTime;
  }

  const isCompleted = displayProgress === 100;
  const isMilestone = task.type === 'milestone';

  const startDiff = diffDays(displayStart, timelineStart);
  if (isMilestone) {
    const style = {
      left: `${(startDiff + 1) * pixelsPerDay}px`,
      top: '50%',
      transform: 'translate(-50%, -50%)',
    };

    return (
      <div className={`h-12 border-b border-gray-100 relative group transition-colors hover:bg-white/50`}>
        <div
          className={`absolute z-10 cursor-grab hover:scale-110 transition-transform ${isDraggingThis ? 'cursor-grabbing scale-125' : ''}`}
          style={style}
          onMouseDown={(e) => onMouseDown(e, task, 'move')}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onEditTask(task);
          }}
        >
          <div className="relative flex items-center justify-center">
            <div style={{ color: assigneeColor.bar }} className="text-lg leading-none">▼</div>
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

  const rawDuration = diffDays(displayEnd, displayStart) + 1;
  const duration = Math.max(0.5, rawDuration - (displayStartTime === 'PM' ? 0.5 : 0) - (displayEndTime === 'AM' ? 0.5 : 0));
  const offset = (displayStartTime === 'PM') ? 0.5 : 0;

  const style = {
    left: `${(startDiff + offset) * pixelsPerDay}px`,
    width: `${duration * pixelsPerDay}px`
  };

  return (
    <div className={`h-12 border-b border-gray-100 relative group transition-colors ${isCompleted && !isDraggingThis ? 'bg-gray-100' : 'hover:bg-white/50'}`}>
      <div
        className={`absolute top-2 h-8 rounded-md shadow-sm flex items-center group-task select-none transition-none
          ${isDraggingThis && dragMode === 'move' ? 'cursor-grabbing ring-2 ring-blue-400 shadow-xl z-30 opacity-95' : 'cursor-grab hover:shadow-md z-10 transition-colors duration-300'}
          ${isSelected ? 'ring-2 ring-blue-500 z-20 shadow-md' : ''}
        `}
        style={{
          ...style,
          backgroundColor: isCompleted ? '#f3f4f6' : assigneeColor.bg,
          borderColor: isSelected ? '#3b82f6' : (isCompleted ? '#9ca3af' : assigneeColor.border),
          borderWidth: isSelected ? '2px' : '1px'
        }}
        onMouseDown={(e) => onMouseDown(e, task, 'move')}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onEditTask(task);
        }}
      >
        <div
          className={`h-full rounded-l-md transition-colors duration-300`}
          style={{ width: `${displayProgress}%`, backgroundColor: isCompleted ? '#6b7280' : assigneeColor.bar }}
        />

        <div
          className={`absolute top-0 bottom-0 w-6 -ml-3 cursor-ew-resize z-40 flex items-center justify-center transition-opacity
            ${isDraggingThis && dragMode === 'change-progress' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}
          style={{ left: `${displayProgress}%` }}
          onMouseDown={(e) => onMouseDown(e, task, 'change-progress')}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <div className="w-1.5 h-4 bg-white rounded-full shadow-md ring-1 ring-gray-300 transform transition-transform hover:scale-110 active:scale-125" />
        </div>

        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-medium text-gray-700 pointer-events-none flex items-center gap-2">
          <span>{displayProgress}%</span>
          <span>{task.name}</span>
        </div>

        <div
          className="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize hover:bg-black/10 rounded-l-md transition-colors z-20"
          onMouseDown={(e) => onMouseDown(e, task, 'resize-left')}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize hover:bg-black/10 rounded-r-md transition-colors z-20"
          onMouseDown={(e) => onMouseDown(e, task, 'resize-right')}
        />
      </div>
    </div>
  );
});

// -------------------------------------------------------------------------
// Main Component
// -------------------------------------------------------------------------

export const GanttChart = forwardRef<HTMLDivElement, GanttChartProps>(({
  items, timelineStart, timelineEnd, viewMode, settings,
  onTaskUpdate, onTasksUpdate, onEditTask, onToggleGroup, onScroll,
  selectedTaskIds, onToggleSelection, onSelectTask,
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
    isDragging: false, taskId: null, mode: null, initialX: 0,
    originalStart: new Date(), originalEnd: new Date(),
  });

  const pixelsPerDay = getPixelsPerDay(viewMode, settings.minDayUnit);

  const ticks = useMemo(() => {
    return generateTicks(timelineStart, timelineEnd, viewMode);
  }, [timelineStart, timelineEnd, viewMode]);

  const getTickWidth = useCallback((index: number) => {
    if (index >= ticks.length - 1) return 100;
    return diffDays(ticks[index + 1], ticks[index]) * pixelsPerDay;
  }, [ticks, pixelsPerDay]);

  const totalWidth = useMemo(() => {
    return ticks.reduce((acc, _, i) => acc + getTickWidth(i), 0);
  }, [ticks, getTickWidth]);

  // Drag Handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, task: Task, mode: DragState['mode']) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    const isMulti = e.ctrlKey || e.metaKey;
    const isRange = e.shiftKey;
    const isSelected = selectedTaskIds?.has(task.id);

    if (mode === 'move') {
      if (isMulti || isRange) {
        onToggleSelection?.(task.id, isMulti, isRange);
        return;
      }
    }

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

    const initialSnapshots: Record<string, any> = {};
    tasksToDrag.forEach(t => {
      const s = parseDate(t.startDate);
      const e = parseDate(t.endDate);
      initialSnapshots[t.id] = {
        start: s, end: e,
        startTime: t.startTime, endTime: t.endTime,
        progress: t.progress,
        workdays: t.workdays ?? calculateWorkdays(s, e, settings, t.startTime, t.endTime)
      };
    });

    setDragState({
      isDragging: true, taskId: task.id, mode, initialX: e.clientX,
      originalStart: parseDate(task.startDate), originalEnd: parseDate(task.endDate),
      originalStartTime: task.startTime, originalEndTime: task.endTime,
      currentStart: parseDate(task.startDate), currentEnd: parseDate(task.endDate),
      currentStartTime: task.startTime, currentEndTime: task.endTime,
      currentProgress: task.progress, initialSnapshots
    });
  }, [tasks, selectedTaskIds, onToggleSelection, settings]);

  const dragStateRef = useRef(dragState);
  useEffect(() => { dragStateRef.current = dragState; }, [dragState]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const currentDragState = dragStateRef.current;
    if (!currentDragState.isDragging || !currentDragState.taskId) return;

    // Throttle or simplified logic could go here, but logic is necessary for feedback.
    // Optimization: avoid redundant state updates if values haven't changed effectively (e.g. within same day/pixel block)

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

      setDragState(prev => {
        if (prev.currentProgress === newProgress) return prev; // Skip update
        return { ...prev, currentProgress: newProgress };
      });
      return;
    }

    const deltaX = e.clientX - currentDragState.initialX;
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
        const endResult = calculateEndDate(newStart, snapshot.workdays, settings, newStartTime);
        newEnd = endResult.date;
        newEndTime = endResult.timing;
      } else {
        const endResult = addTimeUnits(currentDragState.originalEnd, currentDragState.originalEndTime || 'PM', deltaDays, settings.minDayUnit || 1);
        newEnd = endResult.date;
        newEndTime = endResult.timing;
      }
    } else if (currentDragState.mode === 'resize-left') {
      const startResult = addTimeUnits(currentDragState.originalStart, currentDragState.originalStartTime || 'AM', deltaDays, settings.minDayUnit || 1);
      newStart = startResult.date;
      newStartTime = startResult.timing;
      if (newStart > newEnd) newStart = newEnd;
    } else if (currentDragState.mode === 'resize-right') {
      const endResult = addTimeUnits(currentDragState.originalEnd, currentDragState.originalEndTime || 'PM', deltaDays, settings.minDayUnit || 1);
      newEnd = endResult.date;
      newEndTime = endResult.timing;
      if (newEnd < newStart) newEnd = newStart;
    }

    setDragState(prev => {
      // Very basic check to avoid excessive updates if dates/times match exactly
      // But since we have sub-day precision, strict equality check is okay
      if (prev.currentStart?.getTime() === newStart.getTime() &&
        prev.currentEnd?.getTime() === newEnd.getTime() &&
        prev.currentStartTime === newStartTime &&
        prev.currentEndTime === newEndTime) {
        return prev;
      }
      return {
        ...prev,
        currentStart: newStart, currentEnd: newEnd,
        currentStartTime: newStartTime, currentEndTime: newEndTime
      };
    });

  }, [pixelsPerDay, tasks, timelineStart, settings]);

  const handleMouseUp = useCallback(() => {
    const currentDragState = dragStateRef.current;
    if (currentDragState.isDragging && currentDragState.taskId) {
      const draggedTask = tasks.find(t => t.id === currentDragState.taskId);

      const hasMoved = currentDragState.initialX !== undefined && Math.abs((dragState.initialX || 0) - currentDragState.initialX) > 5;
      const startDiff = (currentDragState.currentStart && currentDragState.originalStart)
        ? diffDays(currentDragState.currentStart, currentDragState.originalStart) : 0;
      const isSameDay = startDiff === 0;
      const isSameTime = currentDragState.currentStartTime === currentDragState.originalStartTime;
      const hasMovedEffective = !isSameDay || !isSameTime;

      if (!hasMovedEffective && currentDragState.mode === 'move' && onSelectTask) {
        onSelectTask(currentDragState.taskId);
      }

      if (draggedTask) {
        const updates: Task[] = [];
        if (!currentDragState.initialSnapshots || Object.keys(currentDragState.initialSnapshots).length <= 1) {
          let taskUpdates: Partial<Task> = {};
          let hasChanges = false;
          if (currentDragState.currentStart && currentDragState.currentEnd) {
            const s = formatDate(currentDragState.currentStart);
            const e = formatDate(currentDragState.currentEnd);
            if (s !== draggedTask.startDate || e !== draggedTask.endDate || currentDragState.currentStartTime !== draggedTask.startTime || currentDragState.currentEndTime !== draggedTask.endTime) {
              taskUpdates.startDate = s; taskUpdates.endDate = e;
              taskUpdates.startTime = currentDragState.currentStartTime; taskUpdates.endTime = currentDragState.currentEndTime;
              if (currentDragState.mode === 'resize-left' || currentDragState.mode === 'resize-right') {
                const newWorkdays = calculateWorkdays(currentDragState.currentStart, currentDragState.currentEnd, settings, currentDragState.currentStartTime || 'AM', currentDragState.currentEndTime || 'PM');
                taskUpdates.workdays = newWorkdays;
              }
              hasChanges = true;
            }
          }
          if (currentDragState.currentProgress !== undefined && currentDragState.currentProgress !== draggedTask.progress) {
            taskUpdates.progress = currentDragState.currentProgress;
            hasChanges = true;
          }
          if (hasChanges) updates.push({ ...draggedTask, ...taskUpdates });
        } else {
          // Bulk Move
          if (currentDragState.mode === 'move' && hasMovedEffective) {
            let totalDelta = diffDays(currentDragState.currentStart!, currentDragState.originalStart);
            const t1 = (currentDragState.currentStartTime === 'PM' ? 0.5 : 0);
            const t0 = (currentDragState.originalStartTime === 'PM' ? 0.5 : 0);
            totalDelta += (t1 - t0);

            Object.entries(currentDragState.initialSnapshots).forEach(([tId, snapshot]: [string, any]) => {
              const t = tasks.find(x => x.id === tId);
              if (t) {
                const newStartObj = addTimeUnits(snapshot.start, snapshot.startTime || 'AM', totalDelta, settings.minDayUnit || 1);
                let newEndObj;
                if (snapshot.workdays) {
                  newEndObj = calculateEndDate(newStartObj.date, snapshot.workdays, settings, newStartObj.timing);
                } else {
                  newEndObj = addTimeUnits(snapshot.end, snapshot.endTime || 'PM', totalDelta, settings.minDayUnit || 1);
                }
                updates.push({
                  ...t,
                  startDate: formatDate(newStartObj.date), startTime: newStartObj.timing,
                  endDate: formatDate(newEndObj.date), endTime: newEndObj.timing
                });
              }
            });
          }
        }

        if (updates.length > 0) {
          if (onTasksUpdate) onTasksUpdate(updates);
          else onTaskUpdate(updates[0]);
        }
      }

      setDragState(prev => ({ ...prev, isDragging: false, taskId: null, mode: null, currentStart: undefined, currentEnd: undefined, initialSnapshots: undefined }));
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

  return (
    <div className="relative flex-1 overflow-auto hide-scrollbar select-none" ref={chartRef} onScroll={onScroll}>
      <GanttHeader ticks={ticks} viewMode={viewMode} settings={settings} getTickWidth={getTickWidth} />
      <div className="relative" style={{ minWidth: totalWidth }}>
        <GanttBackground ticks={ticks} viewMode={viewMode} settings={settings} getTickWidth={getTickWidth} />

        {/* Timeline Drop Highlight (Bulk Move) */}
        {dragState.isDragging && dragState.mode === 'move' && dragState.initialSnapshots && Object.entries(dragState.initialSnapshots).map(([id, snap]: [string, any]) => {
          const startDelta = diffDays(dragState.currentStart!, dragState.originalStart);
          const currentS = addDays(snap.start, startDelta);
          const currentE = snap.workdays
            ? addWorkdays(currentS, snap.workdays, settings)
            : addDays(snap.end, startDelta);
          return (
            <div key={`highlight-${id}`} className="absolute inset-0 z-0 pointer-events-none">
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

        <div className="relative z-10">
          {items.map((item) => {
            if ('type' in item && item.type === 'group') {
              return (
                <div key={item.id} className="h-8 bg-gray-50 border-b border-gray-200 w-full relative flex items-center hover:bg-gray-100/50 transition-colors cursor-pointer" onClick={() => onToggleGroup && onToggleGroup(item.id)}>
                  <div className="sticky left-0 px-2 text-gray-300">
                    {item.isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>
              );
            }

            const task = item as Task;
            const isDraggingThis = dragState.isDragging && dragState.taskId === task.id;
            const isSelected = selectedTaskIds?.has(task.id) || false;
            const assigneeIndex = uniqueAssignees.indexOf(task.assignee || '');
            const assigneeColor = getPaletteColor(assigneeIndex, settings.assigneePalette);

            // Calculate Drag Override values needed for TaskItem
            let dragValues = undefined;
            if (dragState.isDragging && dragState.mode === 'move' && dragState.initialSnapshots?.[task.id]) {
              const snap = dragState.initialSnapshots[task.id];
              const startDelta = diffDays(dragState.currentStart!, dragState.originalStart);
              const dS = addDays(snap.start, startDelta);
              const dE = snap.workdays ? addWorkdays(dS, snap.workdays, settings) : addDays(snap.end, startDelta);
              dragValues = { start: dS, end: dE };
            } else if (isDraggingThis) {
              dragValues = {
                start: dragState.currentStart,
                end: dragState.currentEnd,
                startTime: dragState.currentStartTime,
                endTime: dragState.currentEndTime,
                progress: dragState.currentProgress
              };
            }

            return (
              <TaskItem
                key={task.id}
                task={task}
                settings={settings}
                pixelsPerDay={pixelsPerDay}
                timelineStart={timelineStart}
                assigneeColor={assigneeColor}
                isDraggingThis={isDraggingThis}
                isSelected={isSelected}
                dragMode={dragState.mode}
                dragValues={dragValues}
                onMouseDown={handleMouseDown}
                onEditTask={onEditTask}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
});

GanttChart.displayName = 'GanttChart';
