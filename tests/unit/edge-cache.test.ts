import { describe, it, expect } from 'vitest';
import { generateETag, shouldReturn304 } from '../../src/lib/server/edge-cache';

describe('Edge Cache & ETag Utilities', () => {
	it('should generate a consistent SHA-256 ETag for given inputs', async () => {
		const tag1 = await generateETag('user-1', '30min', '2026-08-15', '2026-08-12T10:00:00Z');
		const tag2 = await generateETag('user-1', '30min', '2026-08-15', '2026-08-12T10:00:00Z');
		expect(tag1).toBe(tag2);
		expect(tag1.startsWith('"')).toBe(true);
		expect(tag1.endsWith('"')).toBe(true);
	});

	it('should generate different ETags if state changes', async () => {
		const tag1 = await generateETag('user-1', '30min', '2026-08-15', '2026-08-12T10:00:00Z');
		const tag2 = await generateETag('user-1', '30min', '2026-08-15', '2026-08-12T11:00:00Z');
		expect(tag1).not.toBe(tag2);
	});

	it('should identify matching If-None-Match header for 304 response', () => {
		const etag = '"abc123def456"';
		expect(shouldReturn304('"abc123def456"', etag)).toBe(true);
		expect(shouldReturn304('"different-etag"', etag)).toBe(false);
		expect(shouldReturn304(null, etag)).toBe(false);
	});
});
