import { Task, ViewMode, AppSettings, ColorSet } from './types';

export const CELL_WIDTH = 38; // Legacy default, replaced by VIEW_SETTINGS

export const VIEW_SETTINGS = {
  Day: { pixelsPerDay: 38, label: '日' },
  Week: { pixelsPerDay: 12, label: '週' }, // 1 week = 84px
  Month: { pixelsPerDay: 4, label: '月' }, // 1 month approx 120px
};

export const getPixelsPerDay = (viewMode: ViewMode, minDayUnit: number = 1): number => {
  if (viewMode === 'Day' && minDayUnit < 1) {
    return 60; // Expanded width for fractional days
  }
  return VIEW_SETTINGS[viewMode].pixelsPerDay;
};

// Helper to generate lighter tints of a color
export const tintColor = (hex: string, factor: number): string => {
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return hex;

  let c = hex.substring(1);
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;

  r = Math.round(r + (255 - r) * factor);
  g = Math.round(g + (255 - g) * factor);
  b = Math.round(b + (255 - b) * factor);

  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// Helper to generate darker shades of a color (for text generation)
export const shadeColor = (hex: string, factor: number): string => {
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return hex;

  let c = hex.substring(1);
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;

  r = Math.round(r * (1 - factor));
  g = Math.round(g * (1 - factor));
  b = Math.round(b * (1 - factor));

  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// Default Palette converted to HEX for user customization
export const DEFAULT_PALETTE: ColorSet[] = [
  { bg: '#dbeafe', border: '#93c5fd', bar: '#3b82f6', textColor: '#ffffff' }, // Blue
  { bg: '#d1fae5', border: '#6ee7b7', bar: '#10b981', textColor: '#ffffff' }, // Emerald
  { bg: '#ffedd5', border: '#fdba74', bar: '#f97316', textColor: '#ffffff' }, // Orange
  { bg: '#ede9fe', border: '#c4b5fd', bar: '#8b5cf6', textColor: '#ffffff' }, // Violet
  { bg: '#cffafe', border: '#67e8f9', bar: '#0891b2', textColor: '#ffffff' }, // Cyan
  { bg: '#fef3c7', border: '#fcd34d', bar: '#d97706', textColor: '#ffffff' }, // Amber
  { bg: '#fae8ff', border: '#f0abfc', bar: '#d946ef', textColor: '#ffffff' }, // Fuchsia
  { bg: '#ecfccb', border: '#bef264', bar: '#65a30d', textColor: '#ffffff' }, // Lime
  { bg: '#e0e7ff', border: '#a5b4fc', bar: '#6366f1', textColor: '#ffffff' }, // Indigo
  { bg: '#ccfbf1', border: '#5eead4', bar: '#14b8a6', textColor: '#ffffff' }, // Teal
  { bg: '#e0f2fe', border: '#7dd3fc', bar: '#0284c7', textColor: '#ffffff' }, // Sky
  { bg: '#f3e8ff', border: '#d8b4fe', bar: '#9333ea', textColor: '#ffffff' }, // Purple
  { bg: '#fef9c3', border: '#fde047', bar: '#ca8a04', textColor: '#ffffff' }, // Yellow
  { bg: '#dcfce7', border: '#86efac', bar: '#16a34a', textColor: '#ffffff' }, // Green
  { bg: '#eff6ff', border: '#bfdbfe', bar: '#2563eb', textColor: '#ffffff' }, // Royal Blue (lighter bg)
  { bg: '#ecfdf5', border: '#a7f3d0', bar: '#059669', textColor: '#ffffff' }, // Deep Emerald (lighter bg)
  { bg: '#fff7ed', border: '#fed7aa', bar: '#ea580c', textColor: '#ffffff' }, // Burnt Orange (lighter bg)
  { bg: '#f0fdfa', border: '#99f6e4', bar: '#0d9488', textColor: '#ffffff' }, // Deep Teal (lighter bg)
  { bg: '#f5f3ff', border: '#ddd6fe', bar: '#7c3aed', textColor: '#ffffff' }, // Deep Violet (lighter bg)
  { bg: '#eef2ff', border: '#c7d2fe', bar: '#4f46e5', textColor: '#ffffff' }, // Deep Indigo (lighter bg)
];

export const DEFAULT_SETTINGS: AppSettings = {
  appName: 'GanttMalti',
  minDayUnit: 1,
  assigneePalette: DEFAULT_PALETTE,
  holidayColors: {
    headerBg: '#fef2f2', // bg-red-50
    gridBg: '#fef2f2',   // bg-red-50
    dateText: '#dc2626', // text-red-600 (Darker shade)
    weekdayText: '#f87171' // text-red-400 (Medium shade)
  },
  customHolidays: [],
  eventColors: {
    headerBg: '#fef9c3', // bg-yellow-100
    gridBg: '#fefce8',   // bg-yellow-50
    dateText: '#ca8a04', // text-yellow-600
    weekdayText: '#eab308' // text-yellow-500
  },
  customEvents: [],
  workdayConfig: {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false, // Default: Exclude (Off)
    sunday: false,   // Default: Exclude (Off)
    holidays: false, // Default: Exclude (Off)
    custom: false    // Default: Exclude (Off) - Custom holidays are holidays
  }
};

// Replaced simple array export with logic that uses settings (handled in component)
// Keeping this for backward compatibility if needed, but components should use settings.
export const getPaletteColor = (index: number, palette: ColorSet[] = DEFAULT_PALETTE) => {
  return palette[index % palette.length];
};

export const parseDate = (dateStr: string): Date => {
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const diffDays = (d1: Date, d2: Date): number => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((d1.getTime() - d2.getTime()) / oneDay);
};

export const getTimelineRange = (tasks: Task[], viewMode: ViewMode) => {
  let start: Date;
  let end: Date;

  if (tasks.length === 0) {
    const today = new Date();
    start = addDays(today, -5);
    end = addDays(today, 15);
  } else {
    let minDate = new Date(tasks[0].startDate);
    let maxDate = new Date(tasks[0].endDate);

    tasks.forEach((t) => {
      const s = new Date(t.startDate);
      const e = new Date(t.endDate);
      if (s < minDate) minDate = s;
      if (e > maxDate) maxDate = e;
    });

    start = addDays(minDate, -7);
    end = addDays(maxDate, 14);
  }

  if (viewMode === 'Week') {
    start.setDate(start.getDate() - start.getDay());
    end = addDays(end, 14);
  } else if (viewMode === 'Month') {
    start.setDate(1);
    end = addDays(end, 60);
  }

  return { start, end };
};

export const generateTicks = (start: Date, end: Date, viewMode: ViewMode): Date[] => {
  const arr = [];
  let current = new Date(start);
  current.setHours(0, 0, 0, 0);

  if (viewMode === 'Day') {
    while (current <= end) {
      arr.push(new Date(current));
      current = addDays(current, 1);
    }
  } else if (viewMode === 'Week') {
    while (current <= end) {
      arr.push(new Date(current));
      current = addDays(current, 7);
    }
  } else if (viewMode === 'Month') {
    current.setDate(1);
    while (current <= end) {
      arr.push(new Date(current));
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
  }
  return arr;
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

// Dynamic Japanese Holiday Calculation

const HOLIDAY_CACHE = new Map<number, Set<string>>();

const getVernalEquinoxDay = (year: number): number => {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
};

const getAutumnalEquinoxDay = (year: number): number => {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
};

const getHolidaysForYear = (year: number): Set<string> => {
  if (HOLIDAY_CACHE.has(year)) {
    return HOLIDAY_CACHE.get(year)!;
  }

  const holidays = new Set<string>();
  const addDate = (m: number, d: number) => {
    holidays.add(`${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  };

  addDate(1, 1);
  addDate(2, 11);
  addDate(2, 23);
  addDate(4, 29);
  addDate(5, 3);
  addDate(5, 4);
  addDate(5, 5);
  addDate(8, 11);
  addDate(11, 3);
  addDate(11, 23);

  addDate(3, getVernalEquinoxDay(year));
  addDate(9, getAutumnalEquinoxDay(year));

  const addHappyMonday = (month: number, weekNum: number) => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    let firstMondayDate = 1 + (1 - firstDay + 7) % 7;
    const targetDate = firstMondayDate + (weekNum - 1) * 7;
    addDate(month, targetDate);
  };

  addHappyMonday(1, 2);
  addHappyMonday(7, 3);
  addHappyMonday(9, 3);
  addHappyMonday(10, 2);

  const sortedBaseHolidays = Array.from(holidays).sort();
  const substituteHolidays = new Set<string>();

  sortedBaseHolidays.forEach(dateStr => {
    const d = new Date(dateStr);
    if (d.getDay() === 0) {
      let nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      while (holidays.has(formatDate(nextDay))) {
        nextDay.setDate(nextDay.getDate() + 1);
      }
      substituteHolidays.add(formatDate(nextDay));
    }
  });

  const citizensHolidays = new Set<string>();
  const combinedHolidays = new Set([...holidays, ...substituteHolidays]);

  const firstDaySep = new Date(year, 8, 1).getDay();
  const firstMondaySep = 1 + (1 - firstDaySep + 7) % 7;
  const respectAgedDay = firstMondaySep + 14;

  const autumnDay = getAutumnalEquinoxDay(year);

  if (autumnDay - respectAgedDay === 2) {
    const sandwichDay = respectAgedDay + 1;
    const sandwichStr = `${year}-09-${String(sandwichDay).padStart(2, '0')}`;
    if (!combinedHolidays.has(sandwichStr)) {
      citizensHolidays.add(sandwichStr);
    }
  }

  const finalSet = new Set([...combinedHolidays, ...citizensHolidays]);
  HOLIDAY_CACHE.set(year, finalSet);
  return finalSet;
};

// Helper to check if a date is a holiday (Japanese or Custom)
// This strictly checks if it IS a holiday, not if it is a workday.
export const isHoliday = (date: Date, customHolidays: string[] = []): boolean => {
  const dateStr = formatDate(date);
  // Check custom holidays first
  if (customHolidays.includes(dateStr)) return true;

  // Check standard Japanese holidays
  const year = date.getFullYear();
  const holidays = getHolidaysForYear(year);
  return holidays.has(dateStr);
};

// Helper to check if a date is a custom event
export const isEvent = (date: Date, customEvents: string[] = []): boolean => {
  const dateStr = formatDate(date);
  return customEvents.includes(dateStr);
};

// Helper to check if a date is weekend
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

// For backward compatibility (deprecated use)
export const isJapaneseHoliday = (date: Date) => isHoliday(date);

// Helper to check if a date is a workday based on settings
export const isWorkday = (date: Date, settings: AppSettings): boolean => {
  const dateStr = formatDate(date);
  const { workdayConfig, customHolidays } = settings;

  // 1. Custom Holidays
  if (customHolidays.includes(dateStr)) {
    return workdayConfig.custom;
  }

  // 2. National Holidays
  // We check purely against Japanese holidays here, disregarding strict custom holiday overrides above
  // because we already handled the "Custom as Holiday" case.
  // Although `isHoliday` includes custom logic, we want pure Japanese holiday logic + Config.
  const year = date.getFullYear();
  const japHolidays = getHolidaysForYear(year);
  if (japHolidays.has(dateStr)) {
    return workdayConfig.holidays;
  }

  // 3. Days of week
  const day = date.getDay();
  if (day === 0) return workdayConfig.sunday;
  if (day === 6) return workdayConfig.saturday;
  if (day === 1) return workdayConfig.monday;
  if (day === 2) return workdayConfig.tuesday;
  if (day === 3) return workdayConfig.wednesday;
  if (day === 4) return workdayConfig.thursday;
  if (day === 5) return workdayConfig.friday;

  return true;
};

// Helper to calculate workdays between two dates (inclusive)
// Updated to accept full settings
export const calculateWorkdays = (
  start: Date,
  end: Date,
  settings: AppSettings,
  startTime: 'AM' | 'PM' = 'AM',
  endTime: 'AM' | 'PM' = 'PM'
): number => {
  let count = 0;
  let current = new Date(start);
  const endDate = new Date(end);

  // Reset time part to ensure accurate day comparison
  current.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  // Swap if end < start (sanity check)
  if (current > endDate) return 0;

  while (current <= endDate) {
    if (isWorkday(current, settings)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  // Adjust for AM/PM
  // Case 1: Start PM -> Missed morning (-0.5)
  if (startTime === 'PM') count -= 0.5;

  // Case 2: End AM -> Missed afternoon (-0.5)
  if (endTime === 'AM') count -= 0.5;

  // Safety: If start == end and Start PM and End AM, count might be negative calculationally?
  // 2/19(PM) to 2/19(AM) <- Invalid range if on same day.
  // Logic: 2/19 PM > 2/19 AM.
  // If user sets Start PM, End AM on same day, that is 0 or invalid (-0.5).
  // We should max(0, count).

  return Math.max(0, count);
};

// 稼働日を加算して終了日時（日付＋AM/PM）を計算する
export const calculateEndDate = (
  startDate: Date,
  workdays: number,
  settings: AppSettings,
  startTiming: 'AM' | 'PM' = 'AM'
): { date: Date, timing: 'AM' | 'PM' } => {

  let current = new Date(startDate);
  let remaining = workdays;

  // Initial deduction logic
  // If starting AM: We have 1.0 day potential today.
  // If starting PM: We have 0.5 day potential today.

  // Check if start date is workday
  if (isWorkday(current, settings)) {
    if (startTiming === 'AM') {
      if (remaining <= 0.5) return { date: current, timing: 'AM' }; // 0.5 day task (AM-AM)
      remaining -= 1.0;
      // If remaining becomes 0, it means it fit exactly in today (AM-PM).
      // But loop logic usually handles 'finding the day'.
      // Let's change strategy: consume capacity.
    } else {
      // PM Start
      if (remaining <= 0.5) return { date: current, timing: 'PM' }; // 0.5 day task (PM-PM)
      remaining -= 0.5;
    }
  }

  // If we still have remaining work, find next days
  while (remaining > 0) {
    current.setDate(current.getDate() + 1);
    if (isWorkday(current, settings)) {
      if (remaining <= 0.5) {
        // Fits in morning of this new day
        return { date: current, timing: 'AM' };
      }
      remaining -= 1.0;
    }
  }

  // If we exact-finished on a day (remaining <= 0 condition met exactly e.g. -0.5??)
  // Actually simplicity:
  // If remaining was 1.0. start AM. -1.0 = 0.
  // We want End PM of that day.
  // My logic above: if remaining <= 0.5 returns...
  // Start AM. days=1.0. 
  // IsWorkday. Remaining > 0.5. Remaining becomes 0. Loop logic continues?
  // No, loop condition `remaining > 0` is false.
  // We end up returning `current`?
  // We need to return valid end timing.

  // Fix:
  // Start AM. 1.0 days.
  // Deduced 1.0. Remaining 0.
  // Loop doesn't run.
  // Return { date: current, timing: 'PM' }.

  return { date: current, timing: 'PM' };
};

// Helper to add time units (respecting AM/PM boundaries)
export const addTimeUnits = (
  date: Date,
  timing: 'AM' | 'PM',
  deltaDays: number,
  minDayUnit: number
): { date: Date, timing: 'AM' | 'PM' } => {
  if (minDayUnit >= 1) {
    // Integer days only
    return { date: addDays(date, Math.round(deltaDays)), timing };
  }

  // Fractional support (0.5 units)
  const steps = Math.round(deltaDays / 0.5);
  let currentDate = new Date(date);
  let currentTiming = timing;

  if (steps > 0) {
    for (let i = 0; i < steps; i++) {
      if (currentTiming === 'AM') {
        currentTiming = 'PM';
      } else {
        currentDate = addDays(currentDate, 1);
        currentTiming = 'AM';
      }
    }
  } else if (steps < 0) {
    for (let i = 0; i < Math.abs(steps); i++) {
      if (currentTiming === 'PM') {
        currentTiming = 'AM';
      } else {
        currentDate = addDays(currentDate, -1);
        currentTiming = 'PM';
      }
    }
  }

  return { date: currentDate, timing: currentTiming };
};

// Legacy support wrapper
export const addWorkdays = (startDate: Date, workdays: number, settings: AppSettings): Date => {
  return calculateEndDate(startDate, workdays, settings).date;
};
