import { describe, it, expect } from 'vitest';
import { shouldSkipCronExecution } from '../../src/lib/server/cron-optimizer';

describe('Cron Optimizer', () => {
	it('should return true if current time is before next scheduled email timestamp', () => {
		const now = new Date('2026-08-12T10:00:00Z').getTime();
		const nextScheduled = new Date('2026-08-12T12:00:00Z').getTime();
		expect(shouldSkipCronExecution(now, nextScheduled)).toBe(true);
	});

	it('should return false if current time is past next scheduled email timestamp', () => {
		const now = new Date('2026-08-12T12:05:00Z').getTime();
		const nextScheduled = new Date('2026-08-12T12:00:00Z').getTime();
		expect(shouldSkipCronExecution(now, nextScheduled)).toBe(false);
	});

	it('should return false if next scheduled timestamp is missing or null', () => {
		const now = new Date('2026-08-12T12:05:00Z').getTime();
		expect(shouldSkipCronExecution(now, null)).toBe(false);
		expect(shouldSkipCronExecution(now, undefined)).toBe(false);
	});
});
