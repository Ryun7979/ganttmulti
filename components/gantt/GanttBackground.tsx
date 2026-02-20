import React from 'react';
import { ViewMode, AppSettings } from '../../types';
import { isHoliday, isEvent, isWeekend } from '../../utils';

interface GanttBackgroundProps {
    ticks: Date[];
    viewMode: ViewMode;
    settings: AppSettings;
    getTickWidth: (i: number) => number;
}

export const GanttBackground = React.memo(({ ticks, viewMode, settings, getTickWidth }: GanttBackgroundProps) => {
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
