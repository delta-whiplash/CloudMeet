/**
 * CalDAV (RFC 4791 / WebDAV RFC 4918) Client
 * Standard HTTP WebDAV calls compatible with Cloudflare Workers.
 */

import {
	generateICalendarEvent,
	parseICalendarBusySlots,
	parseICalendarEvents,
	formatICalDate,
	type CalDavEvent,
	type BusySlot
} from './icalendar';

export interface CalDavConfig {
	serverUrl: string;       // e.g. "https://caldav.example.com/remote.php/dav/calendars/user/"
	username: string;
	password: string;
	calendarPath?: string;   // e.g. "personal" or "work"
}

/**
 * Build WebDAV PROPFIND XML string for discovery and health checks
 */
export function buildPropfindXml(): string {
	return [
		'<?xml version="1.0" encoding="utf-8" ?>',
		'<d:propfind xmlns:d="DAV:">',
		'  <d:prop>',
		'    <d:displayname/>',
		'    <d:resourcetype/>',
		'  </d:prop>',
		'</d:propfind>'
	].join('\n');
}

/**
 * Build CalDAV calendar-query REPORT XML string with start/end time range
 */
export function buildCalendarQueryXml(startDate: Date, endDate: Date): string {
	const startIso = formatICalDate(startDate);
	const endIso = formatICalDate(endDate);

	return [
		'<?xml version="1.0" encoding="utf-8" ?>',
		'<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">',
		'  <d:prop>',
		'    <d:getetag/>',
		'    <c:calendar-data/>',
		'  </d:prop>',
		'  <c:filter>',
		'    <c:comp-filter name="VCALENDAR">',
		'      <c:comp-filter name="VEVENT">',
		`        <c:time-range start="${startIso}" end="${endIso}"/>`,
		'      </c:comp-filter>',
		'    </c:comp-filter>',
		'  </c:filter>',
		'</c:calendar-query>'
	].join('\n');
}

/**
 * CalDAV Client class
 */
export class CalDavClient {
	private config: CalDavConfig;
	private fetchFn: typeof fetch;

	constructor(config: CalDavConfig, customFetch?: typeof fetch) {
		this.config = config;
		this.fetchFn = customFetch || fetch;
	}

	private getFullCalendarUrl(): string {
		let baseUrl = this.config.serverUrl.trim();
		if (!baseUrl.endsWith('/')) {
			baseUrl += '/';
		}
		if (this.config.calendarPath) {
			const path = this.config.calendarPath.replace(/^\//, '');
			return baseUrl + path;
		}
		return baseUrl;
	}

	private getAuthHeader(): string {
		const authStr = `${this.config.username}:${this.config.password}`;
		const encoded = typeof btoa === 'function'
			? btoa(authStr)
			: Buffer.from(authStr).toString('base64');
		return `Basic ${encoded}`;
	}

	/**
	 * Perform PROPFIND to check connection and credentials
	 */
	async testConnection(): Promise<boolean> {
		const url = this.getFullCalendarUrl();
		try {
			const response = await this.fetchFn(url, {
				method: 'PROPFIND',
				headers: {
					Authorization: this.getAuthHeader(),
					Depth: '0',
					'Content-Type': 'application/xml; charset=utf-8'
				},
				body: buildPropfindXml()
			});
			return response.ok || response.status === 207;
		} catch (err) {
			console.error('CalDAV testConnection error:', err);
			return false;
		}
	}

	/**
	 * Query busy times in a date range
	 */
	async getBusyTimes(startDate: Date, endDate: Date): Promise<BusySlot[]> {
		const url = this.getFullCalendarUrl();
		const response = await this.fetchFn(url, {
			method: 'REPORT',
			headers: {
				Authorization: this.getAuthHeader(),
				Depth: '1',
				'Content-Type': 'application/xml; charset=utf-8'
			},
			body: buildCalendarQueryXml(startDate, endDate)
		});

		if (!response.ok && response.status !== 207) {
			const errText = await response.text();
			throw new Error(`CalDAV REPORT failed (${response.status}): ${errText}`);
		}

		const xmlText = await response.text();
		return parseICalendarBusySlots(xmlText);
	}

	/**
	 * Create or update calendar event via PUT
	 */
	async createCalendarEvent(event: CalDavEvent): Promise<void> {
		const calendarUrl = this.getFullCalendarUrl().replace(/\/$/, '');
		const eventUrl = `${calendarUrl}/${encodeURIComponent(event.uid)}.ics`;
		const icsBody = generateICalendarEvent(event);

		const response = await this.fetchFn(eventUrl, {
			method: 'PUT',
			headers: {
				Authorization: this.getAuthHeader(),
				'Content-Type': 'text/calendar; charset=utf-8'
			},
			body: icsBody
		});

		if (!response.ok && response.status !== 201 && response.status !== 204) {
			const errText = await response.text();
			throw new Error(`CalDAV PUT failed (${response.status}): ${errText}`);
		}
	}

	/**
	 * Cancel / Delete calendar event via DELETE
	 */
	async cancelCalendarEvent(uid: string): Promise<void> {
		const calendarUrl = this.getFullCalendarUrl().replace(/\/$/, '');
		const eventUrl = `${calendarUrl}/${encodeURIComponent(uid)}.ics`;

		const response = await this.fetchFn(eventUrl, {
			method: 'DELETE',
			headers: {
				Authorization: this.getAuthHeader()
			}
		});

		if (!response.ok && response.status !== 204 && response.status !== 404) {
			const errText = await response.text();
			throw new Error(`CalDAV DELETE failed (${response.status}): ${errText}`);
		}
	}
}
