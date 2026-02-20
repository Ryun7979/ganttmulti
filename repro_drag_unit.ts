import { addTimeUnits } from './utils';

const mockDate = new Date('2024-01-01T00:00:00');

console.log('--- Testing minDayUnit: 1 ---');
let res = addTimeUnits(mockDate, 'AM', 0.6, 1);
console.log(`Delta 0.6: ${res.date.toISOString()} ${res.timing} (Expect Next Day AM)`);

res = addTimeUnits(mockDate, 'AM', 0.4, 1);
console.log(`Delta 0.4: ${res.date.toISOString()} ${res.timing} (Expect Same Day AM)`);

console.log('\n--- Testing minDayUnit: 0.5 ---');
// 0.6 days / 0.5 = 1.2 -> round to 1 step. 1 step is 0.5 days.
// AM + 0.5 day -> PM of same day.
res = addTimeUnits(mockDate, 'AM', 0.6, 0.5);
console.log(`Delta 0.6: ${res.date.toISOString()} ${res.timing} (Expect Same Day PM)`);

// 0.4 days / 0.5 = 0.8 -> round to 1 step.
res = addTimeUnits(mockDate, 'AM', 0.4, 0.5);
console.log(`Delta 0.4: ${res.date.toISOString()} ${res.timing} (Expect Same Day PM)`);

// 0.2 days / 0.5 = 0.4 -> round to 0 step.
res = addTimeUnits(mockDate, 'AM', 0.2, 0.5);
console.log(`Delta 0.2: ${res.date.toISOString()} ${res.timing} (Expect Same Day AM)`);

// 1.1 days / 0.5 = 2.2 -> round to 2 steps. 2 steps = 1.0 day.
res = addTimeUnits(mockDate, 'AM', 1.1, 0.5);
console.log(`Delta 1.1: ${res.date.toISOString()} ${res.timing} (Expect Next Day AM)`);
