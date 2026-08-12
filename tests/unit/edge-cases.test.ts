import { describe, it, expect } from 'vitest';
import { generateETag, shouldReturn304 } from '../../src/lib/server/edge-cache';
import { shouldSkipCronExecution } from '../../src/lib/server/cron-optimizer';
import { buildSingleQueryAvailabilityParams } from '../../src/lib/server/db-queries';

describe('Edge Cases & Defense-in-Depth Verification', () => {

	describe('ETag & Header Edge Cases', () => {
		it('handles weak ETags correctly', () => {
			const etag = '"sha256hash123"';
			expect(shouldReturn304('W/"sha256hash123"', etag)).toBe(true);
		});

		it('handles wildcard If-None-Match', () => {
			const etag = '"sha256hash123"';
			expect(shouldReturn304('*', etag)).toBe(true);
		});

		it('handles padded or whitespace-heavy headers', () => {
			const etag = '"sha256hash123"';
			expect(shouldReturn304('   "sha256hash123"   ', etag)).toBe(true);
		});

		it('returns false for mismatched ETags or empty headers', () => {
			const etag = '"sha256hash123"';
			expect(shouldReturn304('"wrong-hash"', etag)).toBe(false);
			expect(shouldReturn304('', etag)).toBe(false);
			expect(shouldReturn304(null, etag)).toBe(false);
		});

		it('produces distinct SHA-256 hashes when date or booking timestamp changes', async () => {
			const t1 = await generateETag('u1', 'event', '2026-08-12', '2026-08-12T10:00:00Z');
			const t2 = await generateETag('u1', 'event', '2026-08-13', '2026-08-12T10:00:00Z');
			const t3 = await generateETag('u1', 'event', '2026-08-12', '2026-08-12T10:01:00Z');
			expect(t1).not.toBe(t2);
			expect(t1).not.toBe(t3);
		});
	});

	describe('Cron Fast-Exit Edge Cases', () => {
		it('does not skip if current time is exactly equal to scheduled time', () => {
			const timestamp = 1700000000000;
			expect(shouldSkipCronExecution(timestamp, timestamp)).toBe(false);
		});

		it('does not skip on invalid/unparseable timestamps', () => {
			expect(shouldSkipCronExecution(1700000000000, NaN)).toBe(false);
			expect(shouldSkipCronExecution(1700000000000, null)).toBe(false);
			expect(shouldSkipCronExecution(1700000000000, undefined)).toBe(false);
		});

		it('skips correctly when future date is set', () => {
			const now = 1700000000000;
			const future = 1700003600000; // 1 hour later
			expect(shouldSkipCronExecution(now, future)).toBe(true);
		});
	});

	describe('DB Query Builder Boundaries', () => {
		it('handles day of week boundaries (0 = Sunday, 6 = Saturday)', () => {
			const sunday = buildSingleQueryAvailabilityParams('slug-test', 0);
			const saturday = buildSingleQueryAvailabilityParams('slug-test', 6);
			expect(sunday.params).toEqual(['slug-test', 0]);
			expect(saturday.params).toEqual(['slug-test', 6]);
			expect(sunday.query).toContain('availability_rules ar ON ar.user_id = u.id AND ar.day_of_week = ?');
		});
	});
});
