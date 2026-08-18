import { describe, it, expect, vi } from 'vitest';
import {
	getAggregatedBusyTimes,
	createUnifiedCalendarEvent,
	type UnifiedCalendarUserConfig
} from '../../src/lib/server/calendar';

describe('Unified Calendar Adapter Module', () => {
	const userConfig: UnifiedCalendarUserConfig = {
		userId: 'usr-1',
		googleAccessToken: 'google-token',
		outlookAccessToken: 'outlook-token',
		caldavConfig: {
			serverUrl: 'https://caldav.example.com/dav/',
			username: 'user',
			password: 'pass'
		}
	};

	it('merges busy times from all active calendar providers (Google, Outlook, CalDAV)', async () => {
		const startDate = new Date('2026-09-01T00:00:00Z');
		const endDate = new Date('2026-09-01T23:59:59Z');

		const spyGoogle = vi.fn().mockResolvedValue([
			{ start: '2026-09-01T09:00:00.000Z', end: '2026-09-01T10:00:00.000Z' }
		]);
		const spyOutlook = vi.fn().mockResolvedValue([
			{ start: '2026-09-01T09:30:00.000Z', end: '2026-09-01T10:30:00.000Z' } // overlaps with Google
		]);
		const spyCalDav = vi.fn().mockResolvedValue([
			{ start: '2026-09-01T14:00:00.000Z', end: '2026-09-01T15:00:00.000Z' }
		]);

		const mergedSlots = await getAggregatedBusyTimes(
			userConfig,
			startDate,
			endDate,
			{
				fetchGoogleBusy: spyGoogle,
				fetchOutlookBusy: spyOutlook,
				fetchCalDavBusy: spyCalDav
			}
		);

		// Overlapping slots (09:00-10:00 and 09:30-10:30) should be merged into 09:00-10:30
		expect(mergedSlots).toHaveLength(2);
		expect(mergedSlots[0].start).toBe('2026-09-01T09:00:00.000Z');
		expect(mergedSlots[0].end).toBe('2026-09-01T10:30:00.000Z');
		expect(mergedSlots[1].start).toBe('2026-09-01T14:00:00.000Z');
		expect(mergedSlots[1].end).toBe('2026-09-01T15:00:00.000Z');
	});

	it('routes event creation to CalDAV when inviteCalendar is caldav', async () => {
		const spyCalDavCreate = vi.fn().mockResolvedValue(undefined);

		const result = await createUnifiedCalendarEvent(
			userConfig,
			{
				inviteCalendar: 'caldav',
				summary: 'Design Review',
				description: 'Review new UI',
				startTime: new Date('2026-09-02T10:00:00Z'),
				endTime: new Date('2026-09-02T10:30:00Z'),
				attendeeName: 'Bob',
				attendeeEmail: 'bob@example.com'
			},
			{
				createCalDavEvent: spyCalDavCreate
			}
		);

		expect(spyCalDavCreate).toHaveBeenCalledOnce();
		expect(result.caldavUid).toBeDefined();
		expect(result.provider).toBe('caldav');
	});
});
