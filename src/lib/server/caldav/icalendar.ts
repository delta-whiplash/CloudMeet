/**
 * iCalendar (RFC 5545) parser and generator
 * Pure functions, zero external dependencies, compatible with Cloudflare Workers.
 */

export interface CalDavOrganizer {
	name?: string;
	email: string;
}

export interface CalDavAttendee {
	name?: string;
	email: string;
	status?: 'ACCEPTED' | 'DECLINED' | 'NEEDS-ACTION' | 'TENTATIVE';
}

export interface CalDavEvent {
	uid: string;
	summary: string;
	description?: string;
	location?: string;
	startTime: Date;
	endTime: Date;
	organizer?: CalDavOrganizer;
	attendees?: CalDavAttendee[];
	status?: 'CONFIRMED' | 'CANCELLED' | 'TENTATIVE';
	created?: Date;
	lastModified?: Date;
}

export interface BusySlot {
	start: string; // ISO 8601 string
	end: string;   // ISO 8601 string
}

/**
 * Format Date to UTC iCalendar date-time string (YYYYMMDDTHHMMSSZ)
 */
export function formatICalDate(date: Date): string {
	const pad = (n: number) => n.toString().padStart(2, '0');
	return (
		date.getUTCFullYear().toString() +
		pad(date.getUTCMonth() + 1) +
		pad(date.getUTCDate()) +
		'T' +
		pad(date.getUTCHours()) +
		pad(date.getUTCMinutes()) +
		pad(date.getUTCSeconds()) +
		'Z'
	);
}

/**
 * Parse iCalendar date-time string (YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS) to Date
 */
export function parseICalDate(str: string): Date {
	const cleaned = str.trim().replace(/^TZID=[^:]+:/, '');
	const match = cleaned.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
	if (!match) {
		// Fallback to JS Date parser if ISO string
		return new Date(cleaned);
	}
	const [, year, month, day, hours, minutes, seconds] = match;
	return new Date(
		Date.UTC(
			parseInt(year, 10),
			parseInt(month, 10) - 1,
			parseInt(day, 10),
			parseInt(hours, 10),
			parseInt(minutes, 10),
			parseInt(seconds, 10)
		)
	);
}

/**
 * Escape text for iCalendar fields (RFC 5545 section 3.3.11)
 */
export function escapeICalText(str: string): string {
	return str
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r?\n/g, '\\n');
}

/**
 * Unescape text from iCalendar fields
 */
export function unescapeICalText(str: string): string {
	return str
		.replace(/\\n/gi, '\n')
		.replace(/\\,/g, ',')
		.replace(/\\;/g, ';')
		.replace(/\\\\/g, '\\');
}

/**
 * Generate RFC 5545 VCALENDAR string for an event
 */
export function generateICalendarEvent(event: CalDavEvent): string {
	const lines: string[] = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//CloudMeet//NONSGML v1.0//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:REQUEST',
		'BEGIN:VEVENT',
		`UID:${event.uid}`,
		`DTSTAMP:${formatICalDate(new Date())}`,
		`DTSTART:${formatICalDate(event.startTime)}`,
		`DTEND:${formatICalDate(event.endTime)}`,
		`SUMMARY:${escapeICalText(event.summary)}`
	];

	if (event.description) {
		lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
	}

	if (event.location) {
		lines.push(`LOCATION:${escapeICalText(event.location)}`);
	}

	if (event.status) {
		lines.push(`STATUS:${event.status}`);
	}

	if (event.organizer) {
		const cn = event.organizer.name ? `;CN=${escapeICalText(event.organizer.name)}` : '';
		lines.push(`ORGANIZER${cn}:mailto:${event.organizer.email}`);
	}

	if (event.attendees) {
		for (const att of event.attendees) {
			const cn = att.name ? `;CN=${escapeICalText(att.name)}` : '';
			const status = att.status ? `;PARTSTAT=${att.status}` : '';
			lines.push(`ATTENDEE${cn}${status}:mailto:${att.email}`);
		}
	}

	lines.push('END:VEVENT');
	lines.push('END:VCALENDAR');

	return lines.join('\r\n');
}

/**
 * Parse VCALENDAR text block into CalDavEvent array
 */
export function parseICalendarEvents(icsText: string): CalDavEvent[] {
	const events: CalDavEvent[] = [];
	const veventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/gi;
	let match: RegExpExecArray | null;

	while ((match = veventRegex.exec(icsText)) !== null) {
		const block = match[1];
		const getProp = (name: string): string | null => {
			// Folded lines unfolded
			const unfolded = block.replace(/\r?\n[ \t]/g, '');
			const regex = new RegExp(`(?:^|\\r?\\n)${name}(?:;[^:]*)?:(.*)(?:\\r?\\n|$)`, 'i');
			const m = unfolded.match(regex);
			return m ? m[1].trim() : null;
		};

		const uid = getProp('UID') || `generated-${Math.random().toString(36).substring(2)}`;
		const summaryRaw = getProp('SUMMARY') || 'Untitled Event';
		const descRaw = getProp('DESCRIPTION');
		const locRaw = getProp('LOCATION');
		const dtStartRaw = getProp('DTSTART');
		const dtEndRaw = getProp('DTEND');
		const statusRaw = getProp('STATUS');

		if (dtStartRaw && dtEndRaw) {
			events.push({
				uid,
				summary: unescapeICalText(summaryRaw),
				description: descRaw ? unescapeICalText(descRaw) : undefined,
				location: locRaw ? unescapeICalText(locRaw) : undefined,
				startTime: parseICalDate(dtStartRaw),
				endTime: parseICalDate(dtEndRaw),
				status: (statusRaw?.toUpperCase() as any) || 'CONFIRMED'
			});
		}
	}

	return events;
}

/**
 * Extract busy slots from iCalendar text
 */
export function parseICalendarBusySlots(icsText: string): BusySlot[] {
	const events = parseICalendarEvents(icsText);
	return events
		.filter(evt => evt.status !== 'CANCELLED')
		.map(evt => ({
			start: evt.startTime.toISOString(),
			end: evt.endTime.toISOString()
		}));
}
