
export interface Task {
  id: string;
  name: string;
  assignee: string;
  startDate: string; // ISO Date string YYYY-MM-DD
  endDate: string;   // ISO Date string YYYY-MM-DD
  progress: number;  // 0-100
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
  // Temporary state for visual feedback during drag
  currentStart?: Date;
  currentEnd?: Date;
  currentProgress?: number;
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

export interface AppSettings {
  appName: string;
  assigneePalette: ColorSet[];
  holidayColors: HolidayColors;
  customHolidays: string[]; // ISO Date strings YYYY-MM-DD
  eventColors: EventColors;
  customEvents: string[]; // ISO Date strings YYYY-MM-DD
}
