import { describe, it, expect } from 'vitest';
import {
	generateICalendarEvent,
	parseICalendarEvents,
	parseICalendarBusySlots,
	type CalDavEvent
} from '../../src/lib/server/caldav/icalendar';

describe('iCalendar (RFC 5545) Module', () => {
	const sampleEvent: CalDavEvent = {
		uid: 'event-12345@cloudmeet',
		summary: 'Project Review with Alice',
		description: 'Discussion on Q3 roadmap\nNotes: Bring documents',
		location: 'https://meet.jit.si/cloudmeet-room',
		startTime: new Date('2026-09-01T10:00:00Z'),
		endTime: new Date('2026-09-01T10:30:00Z'),
		organizer: { name: 'Host Name', email: 'host@example.com' },
		attendees: [{ name: 'Alice', email: 'alice@example.com' }],
		status: 'CONFIRMED'
	};

	describe('generateICalendarEvent', () => {
		it('generates a valid RFC 5545 VCALENDAR string', () => {
			const ics = generateICalendarEvent(sampleEvent);

			expect(ics).toContain('BEGIN:VCALENDAR');
			expect(ics).toContain('VERSION:2.0');
			expect(ics).toContain('PRODID:-//CloudMeet//NONSGML v1.0//EN');
			expect(ics).toContain('BEGIN:VEVENT');
			expect(ics).toContain('UID:event-12345@cloudmeet');
			expect(ics).toContain('SUMMARY:Project Review with Alice');
			expect(ics).toContain('DTSTART:20260901T100000Z');
			expect(ics).toContain('DTEND:20260901T103000Z');
			expect(ics).toContain('ORGANIZER;CN=Host Name:mailto:host@example.com');
			expect(ics).toContain('ATTENDEE;CN=Alice:mailto:alice@example.com');
			expect(ics).toContain('STATUS:CONFIRMED');
			expect(ics).toContain('END:VEVENT');
			expect(ics).toContain('END:VCALENDAR');
		});

		it('escapes special characters in text fields', () => {
			const eventWithSpecialChars: CalDavEvent = {
				...sampleEvent,
				summary: 'Meeting: Sales, Strategy & More; Test\\Line',
				description: 'Line 1\nLine 2, with comma; and semicolon'
			};
			const ics = generateICalendarEvent(eventWithSpecialChars);

			expect(ics).toContain('SUMMARY:Meeting: Sales\\, Strategy & More\\; Test\\\\Line');
			expect(ics).toContain('DESCRIPTION:Line 1\\nLine 2\\, with comma\\; and semicolon');
		});
	});

	describe('parseICalendarEvents', () => {
		it('parses a VCALENDAR string back into CalDavEvent objects', () => {
			const icsContent = [
				'BEGIN:VCALENDAR',
				'VERSION:2.0',
				'BEGIN:VEVENT',
				'UID:unique-id-999',
				'SUMMARY:Team Standup',
				'DESCRIPTION:Daily sync',
				'DTSTART:20261015T090000Z',
				'DTEND:20261015T093000Z',
				'STATUS:CONFIRMED',
				'END:VEVENT',
				'END:VCALENDAR'
			].join('\r\n');

			const events = parseICalendarEvents(icsContent);
			expect(events).toHaveLength(1);
			expect(events[0].uid).toBe('unique-id-999');
			expect(events[0].summary).toBe('Team Standup');
			expect(events[0].description).toBe('Daily sync');
			expect(events[0].startTime.toISOString()).toBe('2026-10-15T09:00:00.000Z');
			expect(events[0].endTime.toISOString()).toBe('2026-10-15T09:30:00.000Z');
			expect(events[0].status).toBe('CONFIRMED');
		});
	});

	describe('parseICalendarBusySlots', () => {
		it('extracts busy slots from VCALENDAR strings', () => {
			const icsContent = [
				'BEGIN:VCALENDAR',
				'BEGIN:VEVENT',
				'DTSTART:20260901T080000Z',
				'DTEND:20260901T090000Z',
				'STATUS:CONFIRMED',
				'END:VEVENT',
				'BEGIN:VEVENT',
				'DTSTART:20260901T110000Z',
				'DTEND:20260901T120000Z',
				'STATUS:CANCELLED',
				'END:VEVENT',
				'END:VCALENDAR'
			].join('\r\n');

			const slots = parseICalendarBusySlots(icsContent);
			// CANCELLED event should be excluded
			expect(slots).toHaveLength(1);
			expect(slots[0].start).toBe('2026-09-01T08:00:00.000Z');
			expect(slots[0].end).toBe('2026-09-01T09:00:00.000Z');
		});
	});
});
