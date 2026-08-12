/**
 * Availability API endpoint (Optimized with CTE queries, Edge Caching, and ETag support)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBusyTimes, getValidAccessToken } from '$lib/server/google-calendar';
import { getOutlookBusyTimes, getValidOutlookAccessToken } from '$lib/server/outlook-calendar';
import { generateETag, shouldReturn304, getCachedResponse, cacheResponse } from '$lib/server/edge-cache';
import { buildSingleQueryAvailabilityParams, type ConsolidatedAvailabilityData } from '$lib/server/db-queries';

interface TimeSlot {
	start: string;
	end: string;
}

export const GET: RequestHandler = async ({ request, url, platform }) => {
	const env = platform?.env;
	if (!env) {
		throw error(500, 'Platform env not available');
	}

	const eventSlug = url.searchParams.get('event');
	const date = url.searchParams.get('date'); // YYYY-MM-DD

	if (!eventSlug || !date) {
		throw error(400, 'Missing required parameters');
	}

	// 1. Check Cloudflare Edge Cache (caches.default)
	const cachedMatch = await getCachedResponse(request);
	if (cachedMatch) {
		return cachedMatch;
	}

	try {
		const db = env.DB;
		const requestedDate = new Date(date);
		const dayOfWeek = requestedDate.getDay();

		// 2. Single Consolidated CTE Query (User + EventType + Rules)
		const { query, params } = buildSingleQueryAvailabilityParams(eventSlug, dayOfWeek);
		const dbResults = await db.prepare(query).bind(...params).all<ConsolidatedAvailabilityData>();

		if (!dbResults.results || dbResults.results.length === 0) {
			throw error(404, 'Event type or user not found');
		}

		const firstRow = dbResults.results[0];
		const user = {
			id: firstRow.user_id,
			timezone: firstRow.timezone || 'UTC',
			settings: firstRow.user_settings
		};

		const eventType = {
			id: firstRow.event_type_id,
			duration: firstRow.duration_minutes,
			availability_calendars: firstRow.availability_calendars
		};

		// 3. ETag validation
		const maxBooking = await db
			.prepare(`SELECT MAX(created_at) as max_date FROM bookings WHERE user_id = ?`)
			.bind(user.id)
			.first<{ max_date: string | null }>();

		const etag = await generateETag(user.id, eventSlug, date, maxBooking?.max_date || '0');
		const ifNoneMatch = request.headers.get('if-none-match');

		if (shouldReturn304(ifNoneMatch, etag)) {
			return new Response(null, {
				status: 304,
				headers: {
					'ETag': etag,
					'Cache-Control': 'public, max-age=60, s-maxage=300'
				}
			});
		}

		const availabilityRules = dbResults.results
			.filter(r => r.start_time && r.end_time)
			.map(r => ({ start_time: r.start_time!, end_time: r.end_time! }));

		if (availabilityRules.length === 0) {
			const res = json({ slots: [] }, {
				headers: { 'ETag': etag, 'Cache-Control': 'public, max-age=60, s-maxage=300' }
			});
			await cacheResponse(request, res, 60);
			return res;
		}

		// Calendar settings
		let userSettings: { defaultAvailabilityCalendars?: string; selectedGoogleCalendars?: string[] } = {};
		try {
			userSettings = user.settings ? JSON.parse(user.settings) : {};
		} catch {
			userSettings = {};
		}

		const availabilityCalendars = eventType.availability_calendars || userSettings.defaultAvailabilityCalendars || 'both';
		const useGoogleCalendar = availabilityCalendars === 'google' || availabilityCalendars === 'both';
		const useOutlookCalendar = availabilityCalendars === 'outlook' || availabilityCalendars === 'both';

		const startOfDay = new Date(requestedDate);
		startOfDay.setHours(0, 0, 0, 0);
		const endOfDay = new Date(requestedDate);
		endOfDay.setHours(23, 59, 59, 999);

		let busySlots: TimeSlot[] = [];

		if (useGoogleCalendar) {
			try {
				const accessToken = await getValidAccessToken(db, user.id, env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
				const googleBusy = await getBusyTimes(accessToken, startOfDay, endOfDay, userSettings.selectedGoogleCalendars);
				busySlots.push(...googleBusy);
			} catch (err) {
				console.error('Error fetching Google Calendar busy times:', err);
			}
		}

		if (useOutlookCalendar && env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET) {
			try {
				const outlookToken = await getValidOutlookAccessToken(db, user.id, env.MICROSOFT_CLIENT_ID, env.MICROSOFT_CLIENT_SECRET);
				const outlookBusy = await getOutlookBusyTimes(outlookToken, startOfDay, endOfDay);
				busySlots.push(...outlookBusy);
			} catch (err) {
				console.error('Error fetching Outlook Calendar busy times:', err);
			}
		}

		const bookings = await db
			.prepare(
				`SELECT start_time, end_time
				FROM bookings
				WHERE user_id = ? AND DATE(start_time) = ? AND status = 'confirmed'
				ORDER BY start_time`
			)
			.bind(user.id, date)
			.all<{ start_time: string; end_time: string }>();

		const allBusySlots = [
			...busySlots,
			...bookings.results.map(b => ({ start: b.start_time, end: b.end_time }))
		];

		const slots: TimeSlot[] = [];

		function createDateInTimezone(dateStr: string, timeStr: string, timezone: string): Date {
			const [hour, minute] = timeStr.split(':').map(Number);
			const dateTimeStr = `${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

			const formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: timezone,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hour12: false
			});

			const targetDate = new Date(dateTimeStr + 'Z');
			const parts = formatter.formatToParts(targetDate);
			const tzHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
			const tzMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');

			const targetMinutes = hour * 60 + minute;
			const actualMinutes = tzHour * 60 + tzMinute;
			let offsetMinutes = actualMinutes - targetMinutes;

			if (offsetMinutes > 720) offsetMinutes -= 1440;
			if (offsetMinutes < -720) offsetMinutes += 1440;

			return new Date(targetDate.getTime() - offsetMinutes * 60 * 1000);
		}

		for (const rule of availabilityRules) {
			const ruleStart = createDateInTimezone(date, rule.start_time, user.timezone);
			const ruleEnd = createDateInTimezone(date, rule.end_time, user.timezone);

			let currentTime = new Date(ruleStart);
			const slotDuration = eventType.duration;
			const slotIncrement = Math.min(slotDuration, 30);

			while (currentTime.getTime() + slotDuration * 60 * 1000 <= ruleEnd.getTime()) {
				const slotEnd = new Date(currentTime.getTime() + slotDuration * 60 * 1000);

				const hasConflict = allBusySlots.some(busy => {
					const busyStart = new Date(busy.start).getTime();
					const busyEnd = new Date(busy.end).getTime();
					const slotStartMs = currentTime.getTime();
					const slotEndMs = slotEnd.getTime();
					return slotStartMs < busyEnd && slotEndMs > busyStart;
				});

				if (!hasConflict) {
					slots.push({
						start: currentTime.toISOString(),
						end: slotEnd.toISOString()
					});
				}

				currentTime.setMinutes(currentTime.getMinutes() + slotIncrement);
			}
		}

		const response = json({ slots }, {
			headers: {
				'ETag': etag,
				'Cache-Control': 'public, max-age=60, s-maxage=300'
			}
		});

		await cacheResponse(request, response, 60);
		return response;
	} catch (err: any) {
		console.error('Availability API error:', err);
		if (err?.status) throw err;
		throw error(500, 'Failed to fetch availability');
	}
};
