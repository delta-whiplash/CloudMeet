import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	CalDavClient,
	buildCalendarQueryXml,
	buildPropfindXml,
	type CalDavConfig
} from '../../src/lib/server/caldav/caldav-client';
import type { CalDavEvent } from '../../src/lib/server/caldav/icalendar';

describe('CalDAV WebDAV Client Module', () => {
	const config: CalDavConfig = {
		serverUrl: 'https://caldav.example.com/remote.php/dav/calendars/user/',
		username: 'user@example.com',
		password: 'secretpassword',
		calendarPath: 'personal'
	};

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('buildPropfindXml', () => {
		it('generates valid WebDAV PROPFIND XML payload', () => {
			const xml = buildPropfindXml();
			expect(xml).toContain('<?xml version="1.0" encoding="utf-8" ?>');
			expect(xml).toContain('<d:propfind xmlns:d="DAV:">');
			expect(xml).toContain('<d:displayname/>');
			expect(xml).toContain('<d:resourcetype/>');
		});
	});

	describe('buildCalendarQueryXml', () => {
		it('generates valid CalDAV calendar-query REPORT XML payload with start/end range', () => {
			const start = new Date('2026-09-01T00:00:00Z');
			const end = new Date('2026-09-07T23:59:59Z');
			const xml = buildCalendarQueryXml(start, end);

			expect(xml).toContain('<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">');
			expect(xml).toContain('start="20260901T000000Z"');
			expect(xml).toContain('end="20260907T235959Z"');
			expect(xml).toContain('<c:calendar-data/>');
		});
	});

	describe('CalDavClient API Methods', () => {
		it('testConnection performs a PROPFIND request with Basic Auth', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 207, // Multi-Status
				text: async () => '<d:multistatus xmlns:d="DAV:"></d:multistatus>'
			});

			const client = new CalDavClient(config, mockFetch as any);
			const isConnected = await client.testConnection();

			expect(isConnected).toBe(true);
			expect(mockFetch).toHaveBeenCalledWith(
				'https://caldav.example.com/remote.php/dav/calendars/user/personal',
				expect.objectContaining({
					method: 'PROPFIND',
					headers: expect.objectContaining({
						'Authorization': expect.stringMatching(/^Basic /),
						'Depth': '0'
					})
				})
			);
		});

		it('getBusyTimes sends a REPORT request and parses returned VCALENDAR events', async () => {
			const sampleReportXml = `<?xml version="1.0" encoding="utf-8"?>
			<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
				<d:response>
					<d:href>/personal/evt1.ics</d:href>
					<d:propstat>
						<d:prop>
							<c:calendar-data>BEGIN:VCALENDAR
BEGIN:VEVENT
UID:evt1
DTSTART:20260901T100000Z
DTEND:20260901T110000Z
SUMMARY:Busy Time
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR</c:calendar-data>
						</d:prop>
					</d:propstat>
				</d:response>
			</d:multistatus>`;

			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 207,
				text: async () => sampleReportXml
			});

			const client = new CalDavClient(config, mockFetch as any);
			const slots = await client.getBusyTimes(
				new Date('2026-09-01T00:00:00Z'),
				new Date('2026-09-02T00:00:00Z')
			);

			expect(slots).toHaveLength(1);
			expect(slots[0].start).toBe('2026-09-01T10:00:00.000Z');
			expect(slots[0].end).toBe('2026-09-01T11:00:00.000Z');
		});

		it('createCalendarEvent sends a PUT request with generated iCalendar payload', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 201
			});

			const event: CalDavEvent = {
				uid: 'booking-777',
				summary: 'Consultation Call',
				startTime: new Date('2026-09-05T14:00:00Z'),
				endTime: new Date('2026-09-05T14:30:00Z')
			};

			const client = new CalDavClient(config, mockFetch as any);
			await client.createCalendarEvent(event);

			expect(mockFetch).toHaveBeenCalledWith(
				'https://caldav.example.com/remote.php/dav/calendars/user/personal/booking-777.ics',
				expect.objectContaining({
					method: 'PUT',
					headers: expect.objectContaining({
						'Content-Type': 'text/calendar; charset=utf-8'
					}),
					body: expect.stringContaining('BEGIN:VCALENDAR')
				})
			);
		});

		it('cancelCalendarEvent sends a DELETE request', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 204
			});

			const client = new CalDavClient(config, mockFetch as any);
			await client.cancelCalendarEvent('booking-777');

			expect(mockFetch).toHaveBeenCalledWith(
				'https://caldav.example.com/remote.php/dav/calendars/user/personal/booking-777.ics',
				expect.objectContaining({
					method: 'DELETE'
				})
			);
		});
	});
});
