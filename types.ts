
export interface Task {
  id: string;
  name: string;
  assignee: string;
  startDate: string; // ISO Date string YYYY-MM-DD
  endDate: string;   // ISO Date string YYYY-MM-DD
  startTime?: 'AM' | 'PM'; // Default: AM
  endTime?: 'AM' | 'PM';   // Default: PM
  progress: number;  // 0-100
  workdays?: number; // Optional: calculated workdays
  type?: 'task' | 'milestone'; // Default: 'task'
  note?: string; // Optional: task note
}

export interface GroupRow {
  id: string;
  type: 'group';
  title: string;
  isCollapsed?: boolean;
}

export type TaskOrGroup = Task | GroupRow;

export type ViewMode = 'Day' | 'Week' | 'Month';

export interface DragState {
  isDragging: boolean;
  taskId: string | null;
  mode: 'move' | 'resize-left' | 'resize-right' | 'change-progress' | null;
  initialX: number;
  originalStart: Date;
  originalEnd: Date;
  originalStartTime?: 'AM' | 'PM';
  originalEndTime?: 'AM' | 'PM';
  // Temporary state for visual feedback during drag
  currentStart?: Date;
  currentEnd?: Date;
  currentStartTime?: 'AM' | 'PM';
  currentEndTime?: 'AM' | 'PM';
  currentProgress?: number;
  // For bulk dragging
  initialSnapshots?: Record<string, {
    start: Date;
    end: Date;
    startTime?: 'AM' | 'PM';
    endTime?: 'AM' | 'PM';
    progress: number;
    workdays?: number
  }>;
}

export interface Snapshot {
  id: string;
  name: string;
  timestamp: number;
  tasks: Task[];
}

export interface ColorSet {
  bg: string;
  border: string;
  bar: string;
  textColor: string;
}

export interface HolidayColors {
  headerBg: string;
  gridBg: string;
  dateText: string;
  weekdayText: string;
}

export interface EventColors {
  headerBg: string;
  gridBg: string;
  dateText: string;
  weekdayText: string;
}

// 稼働日設定（true=稼働日, false=休日）
export interface WorkdayConfig {
  monday: boolean; // 現状UIにはないが、データ構造として持っておく
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  holidays: boolean; // 日本の祝日
  custom: boolean;   // カスタム休日
}

export interface AppSettings {
  appName: string;
  assigneePalette: ColorSet[];
  holidayColors: HolidayColors;
  customHolidays: string[]; // ISO Date strings YYYY-MM-DD
  eventColors: EventColors;
  customEvents: string[]; // ISO Date strings YYYY-MM-DD
  workdayConfig: WorkdayConfig;
  minDayUnit?: number; // 1 | 0.5 | 0.25 (default: 1)
  fontSize?: 'small' | 'medium' | 'large'; // Default: 'small'
  rowHeight?: number; // Default: 48
  cellWidths?: {
    Day: number;   // Default: 38
    Week: number;  // Default: 84
    Month: number; // Default: 120
  };
}
