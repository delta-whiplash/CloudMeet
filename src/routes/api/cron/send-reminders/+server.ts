/**
 * Cron endpoint for sending scheduled reminder emails (Optimized with Smart Fast-Exit)
 */

import { json, error, type RequestEvent } from '@sveltejs/kit';
import { sendReminderEmail, getEmailTemplates, resolveEmailTransport, type EmailTemplateType } from '$lib/server/email';
import { shouldSkipCronExecution } from '$lib/server/cron-optimizer';

export const GET = async ({ url, platform }: RequestEvent) => {
	const env = platform?.env;
	if (!env) {
		throw error(500, 'Platform env not available');
	}

	// Verify cron secret
	const cronSecret = url.searchParams.get('secret');
	if (env.CRON_SECRET && cronSecret !== env.CRON_SECRET) {
		throw error(401, 'Unauthorized');
	}

	const now = new Date();

	// 1. Fast-Exit Check via KV Timestamp
	if (env.KV) {
		try {
			const nextScheduledStr = await env.KV.get('next_scheduled_email_timestamp');
			if (nextScheduledStr) {
				const nextScheduledMs = new Date(nextScheduledStr).getTime();
				if (shouldSkipCronExecution(now.getTime(), nextScheduledMs)) {
					return json({
						success: true,
						timestamp: now.toISOString(),
						skipped_fast_exit: true,
						next_scheduled: nextScheduledStr
					});
				}
			}
		} catch (err) {
			console.warn('KV cron optimizer read error:', err);
		}
	}

	const db = env.DB;

	try {
		// Get pending emails
		const pendingEmails = await db
			.prepare(`
				SELECT se.id, se.booking_id, se.template_type, se.scheduled_for,
					b.attendee_name, b.attendee_email, b.start_time, b.end_time, b.meeting_url, b.status,
					e.name as event_name, e.description as event_description,
					u.id as user_id, u.name as host_name, u.email as host_email, u.contact_email, u.settings, u.brand_color
				FROM scheduled_emails se
				JOIN bookings b ON se.booking_id = b.id
				JOIN event_types e ON b.event_type_id = e.id
				JOIN users u ON b.user_id = u.id
				WHERE se.status = 'pending'
				AND se.scheduled_for <= ?
				AND b.status = 'confirmed'
				ORDER BY se.scheduled_for ASC
				LIMIT 50
			`)
			.bind(now.toISOString())
			.all<{
				id: string;
				booking_id: string;
				template_type: string;
				scheduled_for: string;
				attendee_name: string;
				attendee_email: string;
				start_time: string;
				end_time: string;
				meeting_url: string | null;
				status: string;
				event_name: string;
				event_description: string | null;
				user_id: string;
				host_name: string;
				host_email: string;
				contact_email: string | null;
				settings: string | null;
				brand_color: string | null;
			}>();

		const results = {
			processed: 0,
			sent: 0,
			skipped: 0,
			failed: 0,
			errors: [] as string[]
		};

		for (const email of pendingEmails.results) {
			results.processed++;

			try {
				const meetingStart = new Date(email.start_time);
				if (meetingStart < now) {
					await db
						.prepare(`UPDATE scheduled_emails SET status = 'cancelled', error_message = 'Meeting already passed' WHERE id = ?`)
						.bind(email.id)
						.run();
					results.skipped++;
					continue;
				}

				const templates = await getEmailTemplates(db, email.user_id);
				const template = templates.get(email.template_type as EmailTemplateType);

				if (template && !template.is_enabled) {
					await db
						.prepare(`UPDATE scheduled_emails SET status = 'cancelled', error_message = 'Template disabled' WHERE id = ?`)
						.bind(email.id)
						.run();
					results.skipped++;
					continue;
				}

				const transport = await resolveEmailTransport(db, email.user_id, env);
				if (transport.smtp || transport.apiKey) {
					let timeFormat: '12h' | '24h' = '12h';
					try {
						const settings = email.settings ? JSON.parse(email.settings) : {};
						timeFormat = settings.timeFormat === '24h' ? '24h' : '12h';
					} catch {
						// Keep default
					}

					const replyToEmail = email.contact_email || email.host_email;

					await sendReminderEmail(
						{
							attendeeName: email.attendee_name,
							attendeeEmail: email.attendee_email,
							eventName: email.event_name,
							eventDescription: email.event_description || '',
							startTime: new Date(email.start_time),
							endTime: new Date(email.end_time),
							meetingUrl: email.meeting_url,
							bookingId: email.booking_id,
							hostName: email.host_name,
							hostEmail: email.host_email,
							hostContactEmail: email.contact_email || undefined,
							appUrl: env.APP_URL || '',
							customMessage: template?.custom_message,
							timeFormat,
							brandColor: email.brand_color || undefined
						},
						email.template_type as 'reminder_24h' | 'reminder_1h' | 'reminder_30m',
						{
							smtp: transport.smtp,
							apiKey: transport.apiKey,
							from: transport.from,
							replyTo: replyToEmail
						},
						template?.subject || undefined
					);

					await db
						.prepare(`UPDATE scheduled_emails SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?`)
						.bind(email.id)
						.run();
					results.sent++;
				} else {
					await db
						.prepare(`UPDATE scheduled_emails SET status = 'failed', error_message = 'Email transport not configured' WHERE id = ?`)
						.bind(email.id)
						.run();
					results.failed++;
				}
			} catch (err: any) {
				console.error(`Failed to send reminder email ${email.id}:`, err);
				await db
					.prepare(`UPDATE scheduled_emails SET status = 'failed', error_message = ? WHERE id = ?`)
					.bind(err.message || 'Unknown error', email.id)
					.run();
				results.failed++;
				results.errors.push(`Email ${email.id}: ${err.message}`);
			}
		}

		// Update next_scheduled_email_timestamp for subsequent fast-exits
		if (env.KV) {
			try {
				const nextEmail = await db
					.prepare(`SELECT scheduled_for FROM scheduled_emails WHERE status = 'pending' ORDER BY scheduled_for ASC LIMIT 1`)
					.first<{ scheduled_for: string }>();

				if (nextEmail?.scheduled_for) {
					await env.KV.put('next_scheduled_email_timestamp', nextEmail.scheduled_for);
				} else {
					await env.KV.delete('next_scheduled_email_timestamp');
				}
			} catch (err) {
				console.warn('KV cron optimizer write error:', err);
			}
		}

		return json({
			success: true,
			timestamp: now.toISOString(),
			...results
		});
	} catch (err: any) {
		console.error('Cron send-reminders error:', err);
		throw error(500, 'Failed to process reminder emails');
	}
};
