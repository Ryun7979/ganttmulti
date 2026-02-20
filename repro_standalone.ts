
// Mock types
interface AppSettings {
    workdayConfig: {
        monday: boolean;
        tuesday: boolean;
        wednesday: boolean;
        thursday: boolean;
        friday: boolean;
        saturday: boolean;
        sunday: boolean;
        holidays: boolean;
        custom: boolean;
    };
    customHolidays: string[];
}

// Mock isWorkday: assume Sunday is holiday, Monday is workday
function isWorkday(date: Date, settings: AppSettings): boolean {
    const day = date.getDay();
    if (day === 0) return false; // Sunday
    return true; // Others
}

// The function to test (Exact copy of current buggy implementation from utils.ts)
const calculateWorkdays = (
    start: Date,
    end: Date,
    settings: AppSettings,
    startTime: 'AM' | 'PM' = 'AM',
    endTime: 'AM' | 'PM' = 'PM'
): number => {
    let count = 0;
    let current = new Date(start);
    const endDate = new Date(end);

    current.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (current > endDate) return 0;

    while (current <= endDate) {
        if (isWorkday(current, settings)) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }

    // Adjust for AM/PM
    // Case 1: Start PM -> Missed morning (-0.5)
    // Only deduct if the start date itself is a workday (otherwise it wasn't counted anyway)
    if (startTime === 'PM' && isWorkday(start, settings)) count -= 0.5;

    // Case 2: End AM -> Missed afternoon (-0.5)
    // Only deduct if the end date itself is a workday
    if (endTime === 'AM' && isWorkday(end, settings)) count -= 0.5;

    return Math.max(0, count);
};

// Test
const mockSettings: AppSettings = {
    workdayConfig: {
        monday: true, tuesday: true, wednesday: true, thursday: true, friday: true,
        saturday: false, sunday: false, holidays: false, custom: false
    },
    customHolidays: []
};

const startDate = new Date('2024-02-18T00:00:00'); // Sunday (Holiday)
const endDate = new Date('2024-02-19T00:00:00');   // Monday (Workday)

// Start PM on Holiday, End PM on Workday.
// Days: Sunday (0), Monday (1) -> Count = 1.
// Adjustments: Start PM (-0.5).
// Result: 0.5.
// Expected: 1.0 (Since Sunday was not counted, we shouldn't subtract 0.5 for missing its morning)

const result = calculateWorkdays(startDate, endDate, mockSettings, 'PM', 'PM');

console.log(`Result: ${result}`);
if (result === 0.5) {
    console.log("BUG CONFIRMED: Result is 0.5");
} else {
    console.log("BUG NOT REPRODUCED");
}
