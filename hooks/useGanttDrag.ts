import { useState, useCallback, useRef, useEffect } from 'react';
import { Task, DragState, AppSettings } from '../types';
import { parseDate, diffDays, addDays, formatDate, calculateWorkdays, calculateEndDate, addWorkdays, addTimeUnits } from '../utils';

interface UseGanttDragProps {
    tasks: Task[];
    selectedTaskIds?: Set<string>;
    onToggleSelection?: (taskId: string, multi: boolean, range: boolean) => void;
    settings: AppSettings;
    pixelsPerDay: number;
    timelineStart: Date;
    onTasksUpdate?: (tasks: Task[]) => void;
    onTaskUpdate: (task: Task) => void;
    onSelectTask?: (taskId: string) => void;
    chartRef: React.RefObject<HTMLDivElement>;
}

export const useGanttDrag = ({
    tasks,
    selectedTaskIds,
    onToggleSelection,
    settings,
    pixelsPerDay,
    timelineStart,
    onTasksUpdate,
    onTaskUpdate,
    onSelectTask,
    chartRef,
}: UseGanttDragProps) => {

    const [dragState, setDragState] = useState<DragState>({
        isDragging: false, taskId: null, mode: null, initialX: 0,
        originalStart: new Date(), originalEnd: new Date(),
    });

    const dragStateRef = useRef(dragState);
    useEffect(() => { dragStateRef.current = dragState; }, [dragState]);

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

            setDragState(prev => {
                if (prev.currentProgress === newProgress) return prev;
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

    }, [pixelsPerDay, tasks, timelineStart, settings, chartRef]);

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
    }, [tasks, onTaskUpdate, onTasksUpdate, onSelectTask, settings, dragState.initialX, chartRef]);

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

    return { dragState, handleMouseDown };
};
