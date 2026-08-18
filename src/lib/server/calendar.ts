/**
 * Unified Calendar Adapter
 * Aggregates availability and routes calendar actions to Google, Outlook, or CalDAV providers.
 */

import { CalDavClient, type CalDavConfig } from './caldav/caldav-client';
import { getBusyTimes as getGoogleBusyTimes, createCalendarEvent as createGoogleEvent, type BusySlot } from './google-calendar';
import { getOutlookBusyTimes, createOutlookCalendarEvent } from './outlook-calendar';
import type { CalDavEvent } from './caldav/icalendar';

export interface UnifiedCalendarUserConfig {
	userId: string;
	googleAccessToken?: string;
	outlookAccessToken?: string;
	caldavConfig?: CalDavConfig;
}

export interface UnifiedEventCreationRequest {
	inviteCalendar: 'google' | 'outlook' | 'caldav';
	summary: string;
	description?: string;
	startTime: Date;
	endTime: Date;
	attendeeName: string;
	attendeeEmail: string;
	hostEmail?: string;
	notes?: string;
}

export interface UnifiedEventCreationResult {
	provider: 'google' | 'outlook' | 'caldav';
	googleEventId?: string;
	outlookEventId?: string;
	caldavUid?: string;
	meetingUrl?: string;
}

export interface CalendarMockHooks {
	fetchGoogleBusy?: (token: string, start: Date, end: Date) => Promise<BusySlot[]>;
	fetchOutlookBusy?: (token: string, start: Date, end: Date) => Promise<BusySlot[]>;
	fetchCalDavBusy?: (config: CalDavConfig, start: Date, end: Date) => Promise<BusySlot[]>;
	createCalDavEvent?: (config: CalDavConfig, event: CalDavEvent) => Promise<void>;
}

/**
 * Merge overlapping busy slots
 */
export function mergeBusySlots(slots: BusySlot[]): BusySlot[] {
	if (slots.length === 0) return [];

	const sorted = [...slots].sort((a, b) =>
		new Date(a.start).getTime() - new Date(b.start).getTime()
	);

	const merged: BusySlot[] = [sorted[0]];

	for (let i = 1; i < sorted.length; i++) {
		const current = sorted[i];
		const last = merged[merged.length - 1];

		if (new Date(current.start) <= new Date(last.end)) {
			last.end = new Date(current.end) > new Date(last.end) ? current.end : last.end;
		} else {
			merged.push(current);
		}
	}

	return merged;
}

/**
 * Aggregate busy slots from all configured providers
 */
export async function getAggregatedBusyTimes(
	userConfig: UnifiedCalendarUserConfig,
	startDate: Date,
	endDate: Date,
	hooks?: CalendarMockHooks
): Promise<BusySlot[]> {
	const allBusy: BusySlot[] = [];
	const promises: Promise<BusySlot[]>[] = [];

	if (userConfig.googleAccessToken) {
		const fetcher = hooks?.fetchGoogleBusy || getGoogleBusyTimes;
		promises.push(fetcher(userConfig.googleAccessToken, startDate, endDate).catch(() => []));
	}

	if (userConfig.outlookAccessToken) {
		const fetcher = hooks?.fetchOutlookBusy || getOutlookBusyTimes;
		promises.push(fetcher(userConfig.outlookAccessToken, startDate, endDate).catch(() => []));
	}

	if (userConfig.caldavConfig && userConfig.caldavConfig.serverUrl) {
		const fetcher = hooks?.fetchCalDavBusy || (async (cfg, start, end) => {
			const client = new CalDavClient(cfg);
			return client.getBusyTimes(start, end);
		});
		promises.push(fetcher(userConfig.caldavConfig, startDate, endDate).catch(() => []));
	}

	const results = await Promise.all(promises);
	for (const res of results) {
		allBusy.push(...res);
	}

	return mergeBusySlots(allBusy);
}

/**
 * Create event on selected provider
 */
export async function createUnifiedCalendarEvent(
	userConfig: UnifiedCalendarUserConfig,
	request: UnifiedEventCreationRequest,
	hooks?: CalendarMockHooks
): Promise<UnifiedEventCreationResult> {
	if (request.inviteCalendar === 'caldav' && userConfig.caldavConfig) {
		const uid = `booking-${crypto.randomUUID()}`;
		const caldavEvent: CalDavEvent = {
			uid,
			summary: request.summary,
			description: request.description,
			startTime: request.startTime,
			endTime: request.endTime,
			attendees: [{ name: request.attendeeName, email: request.attendeeEmail }],
			status: 'CONFIRMED'
		};

		if (hooks?.createCalDavEvent) {
			await hooks.createCalDavEvent(userConfig.caldavConfig, caldavEvent);
		} else {
			const client = new CalDavClient(userConfig.caldavConfig);
			await client.createCalendarEvent(caldavEvent);
		}

		return {
			provider: 'caldav',
			caldavUid: uid
		};
	}

	if (request.inviteCalendar === 'outlook' && userConfig.outlookAccessToken) {
		const event = await createOutlookCalendarEvent(userConfig.outlookAccessToken, {
			summary: request.summary,
			description: request.description,
			startTime: request.startTime.toISOString(),
			endTime: request.endTime.toISOString(),
			attendeeEmail: request.attendeeEmail,
			hostEmail: request.hostEmail || request.attendeeEmail,
			createTeamsMeeting: true
		});
		return {
			provider: 'outlook',
			outlookEventId: event.id,
			meetingUrl: event.onlineMeeting?.joinUrl
		};
	}

	// Default fallback: Google Calendar
	if (userConfig.googleAccessToken) {
		const event = await createGoogleEvent(userConfig.googleAccessToken, {
			summary: request.summary,
			description: request.description,
			start: { dateTime: request.startTime.toISOString(), timeZone: 'UTC' },
			end: { dateTime: request.endTime.toISOString(), timeZone: 'UTC' },
			attendees: [{ email: request.attendeeEmail }],
			conferenceData: {
				createRequest: {
					requestId: crypto.randomUUID(),
					conferenceSolutionKey: { type: 'hangoutsMeet' }
				}
			}
		});
		return {
			provider: 'google',
			googleEventId: event.id,
			meetingUrl: event.hangoutLink
		};
	}

	throw new Error(`Calendar provider '${request.inviteCalendar}' is not configured for user`);
}
