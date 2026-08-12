import { describe, it, expect } from 'vitest';
import { buildSingleQueryAvailabilityParams } from '../../src/lib/server/db-queries';

describe('Consolidated D1 Database Queries', () => {
	it('should format CTE query parameters correctly', () => {
		const { query, params } = buildSingleQueryAvailabilityParams('meeting-30', 2);
		expect(query).toContain('WITH target_user AS');
		expect(query).toContain('target_event AS');
		expect(query).toContain('availability_rules');
		expect(params).toEqual(['meeting-30', 2]);
	});
});
