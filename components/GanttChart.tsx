import React, { useRef, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Task, TaskOrGroup, ViewMode, AppSettings } from '../types';
import { parseDate, diffDays, addDays, generateTicks, getPaletteColor, addWorkdays, getPixelsPerDay, addTimeUnits, calculateEndDate } from '../utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { GanttHeader } from './gantt/GanttHeader';
import { GanttBackground } from './gantt/GanttBackground';
import { TaskItem, TaskItemProps } from './gantt/TaskItem';
import { useGanttDrag } from '../hooks/useGanttDrag';

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
  items, timelineStart, timelineEnd, viewMode, settings,
  onTaskUpdate, onTasksUpdate, onEditTask, onToggleGroup, onScroll,
  selectedTaskIds, onToggleSelection, onSelectTask,
}, ref) => {
  const chartRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => chartRef.current!);

  const tasks = useMemo(() => items.filter((i): i is Task => !('type' in i && i.type === 'group')), [items]);

  const pixelsPerDay = getPixelsPerDay(viewMode, settings);

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

  const { dragState, handleMouseDown } = useGanttDrag({
    tasks,
    selectedTaskIds,
    onToggleSelection,
    settings,
    pixelsPerDay,
    timelineStart,
    onTasksUpdate,
    onTaskUpdate,
    onSelectTask,
    chartRef
  });

  return (
    <div className="relative flex-1 overflow-auto hide-scrollbar select-none" ref={chartRef} onScroll={onScroll}>
      <GanttHeader ticks={ticks} viewMode={viewMode} settings={settings} getTickWidth={getTickWidth} />
      <div className="relative" style={{ minWidth: totalWidth }}>
        <GanttBackground ticks={ticks} viewMode={viewMode} settings={settings} getTickWidth={getTickWidth} />

        {/* Timeline Drop Highlight (Bulk Move) */}
        {dragState.isDragging && dragState.mode === 'move' && dragState.initialSnapshots && Object.entries(dragState.initialSnapshots).map(([id, snap]: [string, any]) => {
          const t1_h = (dragState.currentStartTime === 'PM' ? 0.5 : 0);
          const t0_h = (dragState.originalStartTime === 'PM' ? 0.5 : 0);
          let totalDeltaH = diffDays(dragState.currentStart!, dragState.originalStart);
          totalDeltaH += (t1_h - t0_h);

          const startResult = addTimeUnits(snap.start, snap.startTime || 'AM', totalDeltaH, settings.minDayUnit || 1);
          const currentS = startResult.date;
          let endResult;
          if (snap.workdays) {
            endResult = calculateEndDate(currentS, snap.workdays, settings, startResult.timing);
          } else {
            endResult = addTimeUnits(snap.end, snap.endTime || 'PM', totalDeltaH, settings.minDayUnit || 1);
          }
          return (
            <div key={`highlight-${id}`} className="absolute inset-0 z-0 pointer-events-none">
              <div
                className="absolute top-0 bottom-0 bg-blue-400/10 border-l border-r border-blue-400/50"
                style={{
                  left: `${(diffDays(currentS, timelineStart) + (startResult.timing === 'PM' ? 0.5 : 0)) * pixelsPerDay}px`,
                  width: `${(diffDays(endResult.date, currentS) + (endResult.timing === 'PM' ? 1.0 : 0.5) - (startResult.timing === 'PM' ? 0.5 : 0)) * pixelsPerDay}px`
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
            const assigneeColorIndex = settings.assigneeColorMap?.[task.assignee || ''] ?? 0;
            const assigneeColor = getPaletteColor(assigneeColorIndex, settings.assigneePalette);

            // Calculate Drag Override values needed for TaskItem
            let dragValues = undefined;
            if (dragState.isDragging && dragState.mode === 'move' && dragState.initialSnapshots?.[task.id]) {
              const snap = dragState.initialSnapshots[task.id];
              let totalDelta = diffDays(dragState.currentStart!, dragState.originalStart);
              const t1 = (dragState.currentStartTime === 'PM' ? 0.5 : 0);
              const t0 = (dragState.originalStartTime === 'PM' ? 0.5 : 0);
              totalDelta += (t1 - t0);

              const startObj = addTimeUnits(snap.start, snap.startTime || 'AM', totalDelta, settings.minDayUnit || 1);
              let endObj;
              if (snap.workdays) {
                endObj = calculateEndDate(startObj.date, snap.workdays, settings, startObj.timing);
              } else {
                endObj = addTimeUnits(snap.end, snap.endTime || 'PM', totalDelta, settings.minDayUnit || 1);
              }
              dragValues = {
                start: startObj.date,
                end: endObj.date,
                startTime: startObj.timing,
                endTime: endObj.timing
              };
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
