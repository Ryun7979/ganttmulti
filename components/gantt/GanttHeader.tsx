import React from 'react';
import { ViewMode, AppSettings } from '../../types';
import { isHoliday, isEvent, isWeekend } from '../../utils';

interface GanttHeaderProps {
    ticks: Date[];
    viewMode: ViewMode;
    settings: AppSettings;
    getTickWidth: (i: number) => number;
}

export const GanttHeader = React.memo(({ ticks, viewMode, settings, getTickWidth }: GanttHeaderProps) => {
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
