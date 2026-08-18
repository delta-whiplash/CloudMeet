/**
 * Bookings API endpoint
 * Creates new bookings and syncs them with Google Calendar, Outlook Calendar, CalDAV, CardDAV, and SMTP email.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createCalendarEvent, getValidAccessToken } from '$lib/server/google-calendar';
import { createOutlookCalendarEvent, getValidOutlookAccessToken } from '$lib/server/outlook-calendar';
import { CalDavClient } from '$lib/server/caldav/caldav-client';
import { CardDavClient } from '$lib/server/carddav/carddav-client';
import { sendBookingEmail, sendAdminNotificationEmail, getEmailTemplates, isEmailEnabled, type EmailTemplateType } from '$lib/server/email';
import { isValidEmail, validateLength, validateFields, MAX_LENGTHS } from '$lib/server/validation';

export const POST: RequestHandler = async ({ request, platform }) => {
	const env = platform?.env;
	if (!env) {
		throw error(500, 'Platform env not available');
	}

	try {
		const body = await request.json() as {
			eventSlug: string;
			startTime: string;
			endTime: string;
			attendeeName: string;
			attendeeEmail: string;
			notes?: string;
			turnstileToken?: string;
			timezone?: string;
		};
		const { eventSlug, startTime, endTime, attendeeName, attendeeEmail, notes, turnstileToken, timezone } = body;

		// Validate required fields
		if (!eventSlug || !startTime || !endTime || !attendeeName || !attendeeEmail) {
			throw error(400, 'Missing required fields');
		}

		// Validate input lengths
		const lengthError = validateFields([
			validateLength(attendeeName, 'Name', MAX_LENGTHS.name, true),
			validateLength(attendeeEmail, 'Email', MAX_LENGTHS.email, true),
			validateLength(notes, 'Notes', MAX_LENGTHS.notes, false)
		]);
		if (lengthError) {
			throw error(400, lengthError);
		}

		// Validate email format
		if (!isValidEmail(attendeeEmail)) {
			throw error(400, 'Invalid email address');
		}

		// Verify Turnstile token (if provided)
		if (turnstileToken) {
			const turnstileResponse = await fetch(
				'https://challenges.cloudflare.com/turnstile/v0/siteverify',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						secret: env.TURNSTILE_SECRET_KEY || '',
						response: turnstileToken
					})
				}
			);

			const turnstileResult = await turnstileResponse.json() as { success: boolean };
			if (!turnstileResult.success) {
				throw error(400, 'Turnstile verification failed');
			}
		}

		const db = env.DB;

		// Get user with calendar, carddav, and smtp integration credentials
		const user = await db
			.prepare(`SELECT id, email, name, slug, contact_email, settings, brand_color,
				outlook_refresh_token,
				caldav_url, caldav_username, caldav_password, caldav_calendar_path,
				carddav_url, carddav_username, carddav_password,
				smtp_host, smtp_port, smtp_username, smtp_password, smtp_secure, smtp_from
				FROM users LIMIT 1`)
			.first<{
				id: string;
				email: string;
				name: string;
				slug: string;
				contact_email: string | null;
				settings: string | null;
				brand_color: string | null;
				outlook_refresh_token: string | null;
				caldav_url: string | null;
				caldav_username: string | null;
				caldav_password: string | null;
				caldav_calendar_path: string | null;
				carddav_url: string | null;
				carddav_username: string | null;
				carddav_password: string | null;
				smtp_host: string | null;
				smtp_port: number | null;
				smtp_username: string | null;
				smtp_password: string | null;
				smtp_secure: number | null;
				smtp_from: string | null;
			}>();

		if (!user) {
			throw error(404, 'User not found');
		}

		const eventType = await db
			.prepare('SELECT id, name, duration_minutes as duration, description, invite_calendar FROM event_types WHERE user_id = ? AND slug = ? AND is_active = 1')
			.bind(user.id, eventSlug)
			.first<{ id: string; name: string; duration: number; description: string; invite_calendar: string | null }>();

		if (!eventType) {
			throw error(404, 'Event type not found or inactive');
		}

		// Parse user settings for global calendar defaults
		let userSettings: { defaultInviteCalendar?: string } = {};
		try {
			userSettings = user.settings ? JSON.parse(user.settings) : {};
		} catch {
			userSettings = {};
		}

		const outlookConnected = !!user.outlook_refresh_token;
		const outlookConfigured = !!(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET);
		const caldavConfigured = !!(user.caldav_url && user.caldav_username && user.caldav_password);

		let inviteCalendar = eventType.invite_calendar || userSettings.defaultInviteCalendar || 'google';
		if (inviteCalendar === 'outlook' && (!outlookConnected || !outlookConfigured)) {
			inviteCalendar = caldavConfigured ? 'caldav' : 'google';
		} else if (inviteCalendar === 'caldav' && !caldavConfigured) {
			inviteCalendar = 'google';
		}

		// Verify slot availability
		const startDateTime = new Date(startTime);
		const endDateTime = new Date(endTime);

		const conflict = await db
			.prepare(
				`SELECT id FROM bookings
				WHERE user_id = ? AND status = 'confirmed'
				AND (
					(start_time <= ? AND end_time > ?)
					OR (start_time < ? AND end_time >= ?)
					OR (start_time >= ? AND end_time <= ?)
				)`
			)
			.bind(user.id, startTime, startTime, endTime, endTime, startTime, endTime)
			.first();

		if (conflict) {
			throw error(409, 'This time slot is no longer available');
		}

		let googleEventId: string | null = null;
		let outlookEventId: string | null = null;
		let caldavEventId: string | null = null;
		let meetingUrl: string | null = null;

		if (inviteCalendar === 'google') {
			try {
				const accessToken = await getValidAccessToken(
					db,
					user.id,
					env.GOOGLE_CLIENT_ID,
					env.GOOGLE_CLIENT_SECRET
				);

				const calendarEvent = await createCalendarEvent(accessToken, {
					summary: `${eventType.name} with ${attendeeName}`,
					description: `${eventType.description || ''}\n\nAttendee: ${attendeeName} (${attendeeEmail})${notes ? `\n\nNotes from attendee:\n${notes}` : ''}`,
					start: {
						dateTime: startDateTime.toISOString(),
						timeZone: 'UTC'
					},
					end: {
						dateTime: endDateTime.toISOString(),
						timeZone: 'UTC'
					},
					attendees: [{ email: attendeeEmail }],
					conferenceData: {
						createRequest: {
							requestId: crypto.randomUUID(),
							conferenceSolutionKey: { type: 'hangoutsMeet' }
						}
					}
				});

				googleEventId = calendarEvent.id;
				meetingUrl = calendarEvent.hangoutLink || null;
			} catch (err) {
				console.error('Error creating Google Calendar event:', err);
			}
		} else if (inviteCalendar === 'outlook' && env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET) {
			try {
				const outlookToken = await getValidOutlookAccessToken(
					db,
					user.id,
					env.MICROSOFT_CLIENT_ID,
					env.MICROSOFT_CLIENT_SECRET
				);

				const outlookEvent = await createOutlookCalendarEvent(outlookToken, {
					summary: `${eventType.name} with ${attendeeName}`,
					description: `${eventType.description || ''}\n\nAttendee: ${attendeeName} (${attendeeEmail})${notes ? `\n\nNotes from attendee:\n${notes}` : ''}`,
					startTime: startDateTime.toISOString(),
					endTime: endDateTime.toISOString(),
					attendeeEmail,
					hostEmail: user.email,
					createTeamsMeeting: true
				});

				outlookEventId = outlookEvent.id;
				if (outlookEvent.onlineMeeting?.joinUrl) {
					meetingUrl = outlookEvent.onlineMeeting.joinUrl;
				}
			} catch (err) {
				console.error('Error creating Outlook Calendar event:', err);
			}
		} else if (inviteCalendar === 'caldav' && user.caldav_url && user.caldav_username && user.caldav_password) {
			try {
				const client = new CalDavClient({
					serverUrl: user.caldav_url,
					username: user.caldav_username,
					password: user.caldav_password,
					calendarPath: user.caldav_calendar_path || undefined
				});
				const uid = `booking-${crypto.randomUUID()}`;
				await client.createCalendarEvent({
					uid,
					summary: `${eventType.name} with ${attendeeName}`,
					description: `${eventType.description || ''}\n\nAttendee: ${attendeeName} (${attendeeEmail})${notes ? `\n\nNotes:\n${notes}` : ''}`,
					startTime: startDateTime,
					endTime: endDateTime,
					organizer: { name: user.name, email: user.email },
					attendees: [{ name: attendeeName, email: attendeeEmail }],
					status: 'CONFIRMED'
				});
				caldavEventId = uid;
			} catch (err) {
				console.error('Error creating CalDAV event:', err);
			}
		}

		// Optional CardDAV sync
		if (user.carddav_url && user.carddav_username && user.carddav_password) {
			try {
				const cardClient = new CardDavClient({
					serverUrl: user.carddav_url,
					username: user.carddav_username,
					password: user.carddav_password
				});
				await cardClient.createContact({
					uid: `attendee-${crypto.randomUUID()}`,
					fullName: attendeeName,
					email: attendeeEmail,
					note: `Attendee for ${eventType.name} on CloudMeet`
				});
			} catch (err) {
				console.error('CardDAV sync error (non-fatal):', err);
			}
		}

		// Insert booking in DB
		const result = await db
			.prepare(
				`INSERT INTO bookings (
					user_id, event_type_id, start_time, end_time,
					attendee_name, attendee_email, attendee_notes, status,
					google_event_id, outlook_event_id, caldav_event_id, meeting_url, created_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, CURRENT_TIMESTAMP)`
			)
			.bind(
				user.id,
				eventType.id,
				startTime,
				endTime,
				attendeeName,
				attendeeEmail,
				notes || null,
				googleEventId,
				outlookEventId,
				caldavEventId,
				meetingUrl
			)
			.run();

		// Invalidate availability cache
		const dateStr = startDateTime.toISOString().split('T')[0];
		const cacheKey = `availability:${eventSlug}:${dateStr}`;
		await env.KV.delete(cacheKey);

		// Prepare email configuration (SMTP > EmailIt > Console)
		const smtpConfig = (user.smtp_host || env.SMTP_HOST) ? {
			host: user.smtp_host || env.SMTP_HOST || '',
			port: user.smtp_port || Number(env.SMTP_PORT) || 587,
			username: user.smtp_username || env.SMTP_USER,
			password: user.smtp_password || env.SMTP_PASS,
			secure: user.smtp_secure !== null ? !!user.smtp_secure : env.SMTP_SECURE === 'true',
			from: user.smtp_from || env.SMTP_FROM || env.EMAIL_FROM || user.email
		} : undefined;

		const emailApiKey = env.EMAILIT_API_KEY;

		if (smtpConfig || emailApiKey) {
			try {
				let timeFormat: '12h' | '24h' = '12h';
				try {
					const settings = user.settings ? JSON.parse(user.settings) : {};
					timeFormat = settings.timeFormat === '24h' ? '24h' : '12h';
				} catch {
					// Default
				}

				const replyToEmail = user.contact_email || user.email;

				const bookingResult = await db
					.prepare('SELECT id FROM bookings WHERE google_event_id = ? OR outlook_event_id = ? OR caldav_event_id = ? OR (user_id = ? AND start_time = ? AND attendee_email = ?)')
					.bind(googleEventId, outlookEventId, caldavEventId, user.id, startTime, attendeeEmail)
					.first<{ id: string }>();
				const bookingId = bookingResult?.id || result.meta.last_row_id?.toString() || '';

				const templates = await getEmailTemplates(db, user.id);
				const confirmationEnabled = isEmailEnabled(templates, 'confirmation');

				const emailData = {
					attendeeName,
					attendeeEmail,
					eventName: eventType.name,
					eventDescription: eventType.description || '',
					startTime: startDateTime,
					endTime: endDateTime,
					meetingUrl,
					meetingType: (inviteCalendar === 'outlook' ? 'teams' : 'google_meet') as 'google_meet' | 'teams',
					bookingId,
					hostName: user.name,
					hostEmail: user.email,
					hostContactEmail: user.contact_email || undefined,
					appUrl: env.APP_URL || '',
					timeFormat,
					timezone: timezone || 'UTC',
					brandColor: user.brand_color || undefined,
					attendeeNotes: notes || undefined
				};

				if (confirmationEnabled) {
					const template = templates.get('confirmation');
					await sendBookingEmail(
						{
							...emailData,
							customMessage: template?.custom_message
						},
						{
							smtp: smtpConfig,
							apiKey: emailApiKey,
							from: user.smtp_from || env.EMAIL_FROM || user.email,
							replyTo: replyToEmail
						},
						template?.subject || undefined
					);
				}

				await sendAdminNotificationEmail(
					emailData,
					user.contact_email || user.email,
					{
						smtp: smtpConfig,
						apiKey: emailApiKey,
						from: user.smtp_from || env.EMAIL_FROM || user.email
					}
				);

				// Schedule reminders
				const reminderTypes: EmailTemplateType[] = ['reminder_24h', 'reminder_1h'];
				const reminderOffsets: Record<string, number> = {
					'reminder_24h': 24 * 60 * 60 * 1000,
					'reminder_1h': 60 * 60 * 1000
				};

				for (const reminderType of reminderTypes) {
					if (isEmailEnabled(templates, reminderType)) {
						const scheduledFor = new Date(startDateTime.getTime() - reminderOffsets[reminderType]);
						if (scheduledFor > new Date()) {
							await db
								.prepare(`INSERT INTO scheduled_emails (booking_id, template_type, scheduled_for) VALUES (?, ?, ?)`)
								.bind(bookingId, reminderType, scheduledFor.toISOString())
								.run();
						}
					}
				}
			} catch (emailError) {
				console.error('Failed to send confirmation email:', emailError);
			}
		}

		return json({
			success: true,
			bookingId: result.meta.last_row_id,
			meetingUrl,
			meetingType: inviteCalendar === 'outlook' ? 'teams' : 'google_meet'
		});
	} catch (err: any) {
		console.error('Booking creation error:', err);
		if (err?.status) throw err;
		throw error(500, 'Failed to create booking');
	}
};
