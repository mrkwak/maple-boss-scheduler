import { toLocalInput, fromLocalInput, formatWhen } from '@/lib/client';

test('KST datetime-local 왕복', () => {
  expect(toLocalInput('2026-10-10T12:00:00.000Z')).toBe('2026-10-10T21:00');
  expect(fromLocalInput('2026-10-10T21:00')).toBe('2026-10-10T12:00:00.000Z');
  expect(fromLocalInput('')).toBe('');
});

test('표시 형식', () => {
  expect(formatWhen(null)).toBe('시간 미정');
  expect(formatWhen('2026-10-10T12:00:00.000Z')).toMatch(/10\. 10\.|10\/10/);
  expect(formatWhen('2026-10-10T12:00:00.000Z')).toContain('21:00');
});
