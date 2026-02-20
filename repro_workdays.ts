
import { calculateWorkdays, DEFAULT_SETTINGS } from './utils.ts';
import { AppSettings } from './types';

const mockSettings: AppSettings = {
    ...DEFAULT_SETTINGS,
    workdayConfig: {
        ...DEFAULT_SETTINGS.workdayConfig,
        saturday: false,
        sunday: false,
        holidays: false,
    },
    customHolidays: [],
};

// Test Case:
// Start Date: 2024-02-18 (Sunday) - Non-workday
// End Date: 2024-02-19 (Monday) - Workday
// Start Time: PM
// End Time: PM
// Expected: 1.0 day (Monday Full Day)
// Current Bug: 0.5 day (Monday Full Day - 0.5 adjustment from Sunday PM)

const startDate = new Date('2024-02-18T00:00:00'); // Sunday
const endDate = new Date('2024-02-19T00:00:00');   // Monday

const result = calculateWorkdays(startDate, endDate, mockSettings, 'PM', 'PM');

console.log(`Start: ${startDate.toDateString()} PM`);
console.log(`End: ${endDate.toDateString()} PM`);
console.log(`Result Workdays: ${result}`);

if (result === 0.5) {
    console.log("BUG REPRODUCED: Result is 0.5 (Should be 1.0)");
} else if (result === 1.0) {
    console.log("CORRECT: Result is 1.0");
} else {
    console.log(`Unexpected result: ${result}`);
}
