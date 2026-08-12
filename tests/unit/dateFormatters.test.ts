import { describe, it, expect } from 'vitest';
import {
	createFormatters,
	formatDateLocal,
	formatTimeRange,
	formatIsoTime
} from '../../src/lib/utils/dateFormatters';

describe('Date & Time Formatters (src/lib/utils/dateFormatters.ts)', () => {

	describe('createFormatters', () => {
		const testDate = new Date('2026-08-15T14:30:00Z');

		it('formats 12-hour time correctly by default', () => {
			const { formatTime } = createFormatters({ timeFormat: '12h', timezone: 'UTC' });
			expect(formatTime(testDate)).toBe('2:30 PM');
		});

		it('formats 24-hour time correctly when specified', () => {
			const { formatTime } = createFormatters({ timeFormat: '24h', timezone: 'UTC' });
			expect(formatTime(testDate)).toBe('14:30');
		});

		it('handles timezone conversions accurately', () => {
			const { formatTime } = createFormatters({ timeFormat: '24h', timezone: 'America/New_York' });
			// 14:30 UTC -> 10:30 EDT (-4h)
			expect(formatTime(testDate)).toBe('10:30');
		});
	});

	describe('formatDateLocal', () => {
		it('formats Date object into YYYY-MM-DD local string', () => {
			const date = new Date(2026, 7, 15); // Note: August is month 7 in JS Date (0-indexed)
			expect(formatDateLocal(date)).toBe('2026-08-15');
		});
	});

	describe('formatTimeRange', () => {
		it('formats start and end time range string correctly', () => {
			const start = '2026-08-15T10:00:00Z';
			const end = '2026-08-15T11:00:00Z';
			const range = formatTimeRange(start, end, { timeFormat: '24h', timezone: 'UTC' });
			expect(range).toBe('10:00 - 11:00');
		});
	});

	describe('formatIsoTime', () => {
		it('formats ISO string to user preferred time string', () => {
			const iso = '2026-08-15T09:15:00Z';
			expect(formatIsoTime(iso, { timeFormat: '24h', timezone: 'UTC' })).toBe('09:15');
		});
	});
});
