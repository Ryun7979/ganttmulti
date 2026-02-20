import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Task, AppSettings, ColorSet, DragState } from '../../types';
import { parseDate, diffDays } from '../../utils';

export interface TaskItemProps {
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


export const TaskItem = React.memo(({
    task, settings, pixelsPerDay, timelineStart, assigneeColor,
    isDraggingThis, isSelected, dragMode, dragValues,
    onMouseDown, onEditTask
}: TaskItemProps) => {

    const barRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<any>(null);
    const [showNote, setShowNote] = useState(false);
    const [tooltipPos, setTooltipPos] = useState<{ x: number, y: number } | null>(null);

    // Cleanup timer on unmount
    React.useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const handleMouseEnter = () => {
        timerRef.current = setTimeout(() => {
            if (barRef.current) {
                const rect = barRef.current.getBoundingClientRect();
                setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                setShowNote(true);
            }
        }, 1000);
    };

    const handleMouseLeave = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setShowNote(false);
    };

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

    const rowHeight = settings.rowHeight || 48;
    const barHeight = Math.max(20, rowHeight - 16);
    const barTop = (rowHeight - barHeight) / 2;

    const startDiff = diffDays(displayStart, timelineStart);

    // Tooltip Element (Portal)
    const renderTooltip = () => {
        if (!showNote || !task.note || isDraggingThis || !tooltipPos) return null;
        return createPortal(
            <div
                className="fixed z-[9999] bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg pointer-events-none whitespace-pre-wrap max-w-xs"
                style={{
                    left: `${tooltipPos.x}px`,
                    top: `${tooltipPos.y - 4}px`,
                    transform: 'translate(-50%, -100%)',
                }}
            >
                {task.note}
                {/* Triangle */}
                <div className="absolute top-full left-1/2 -ml-1 border-4 border-transparent border-t-gray-800" />
            </div>,
            document.body
        );
    };

    if (isMilestone) {
        const style = {
            left: `${(startDiff + 1) * pixelsPerDay}px`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
        };

        return (
            <>
                <div
                    className={`border-b border-gray-100 relative group transition-colors hover:bg-white/50`}
                    style={{ height: `${rowHeight}px` }}
                >
                    <div
                        ref={barRef}
                        className={`absolute z-10 cursor-grab hover:scale-110 transition-transform ${isDraggingThis ? 'cursor-grabbing scale-125' : ''}`}
                        style={style}
                        onMouseDown={(e) => onMouseDown(e, task, 'move')}
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            onEditTask(task);
                        }}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
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
                {renderTooltip()}
            </>
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
        <>
            <div
                className={`border-b border-gray-100 relative group transition-colors ${isCompleted && !isDraggingThis ? 'bg-gray-100' : 'hover:bg-white/50'}`}
                style={{ height: `${rowHeight}px` }}
            >
                <div
                    ref={barRef}
                    className={`absolute rounded-md shadow-sm flex items-center group-task select-none transition-none
          ${isDraggingThis && dragMode === 'move' ? 'cursor-grabbing ring-2 ring-blue-400 shadow-xl z-30 opacity-95' : 'cursor-grab hover:shadow-md z-10 transition-colors duration-300'}
          ${isSelected ? 'ring-2 ring-blue-500 z-20 shadow-md' : ''}
        `}
                    style={{
                        ...style,
                        top: `${barTop}px`,
                        height: `${barHeight}px`,
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
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
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

                    <div className="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize hover:bg-black/10 rounded-l-md transition-colors z-20"
                        onMouseDown={(e) => onMouseDown(e, task, 'resize-left')}
                    />
                    <div
                        className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize hover:bg-black/10 rounded-r-md transition-colors z-20"
                        onMouseDown={(e) => onMouseDown(e, task, 'resize-right')}
                    />

                    {/* Task Label & Progress */}
                    <div
                        className={`absolute whitespace-nowrap text-xs font-medium text-gray-700 pointer-events-none flex items-center gap-2
                            ${settings.taskLabelPosition === 'top'
                                ? 'left-2 top-1/2 -translate-y-1/2'
                                : 'left-full ml-2 top-1/2 -translate-y-1/2'
                            }
                        `}
                    >
                        <span>{displayProgress}%</span>
                        <span>{task.name}</span>
                    </div>
                </div>
            </div>
            {renderTooltip()}
        </>
    );
});
