/**
 * Email service using SMTP or EmailIt API
 *
 * Main entry point for the email module.
 * Re-exports types, formatters, templates, MIME builder, and SMTP transporter.
 */

// Re-export types
export type { BookingEmailData, RescheduleEmailData, EmailTemplate, EmailTemplateType } from './types';

// Re-export formatters
export { createEmailFormatters, replaceSubjectVariables } from './formatters';

// Re-export template generators
export {
	generateBookingEmail,
	generateBookingEmailText,
	generateCancellationEmail,
	generateAdminCancellationEmail,
	generateRescheduleEmail,
	generateAdminRescheduleEmail,
	generateReminderEmail,
	getDefaultReminderSubject,
	generateAdminNotificationEmail
} from './templates';

// Re-export MIME and SMTP client
export { buildMimeMessage, type MimeEmailOptions } from './mime';
export { SmtpClient, type SmtpConfig } from './smtp-client';
export { sendUnifiedEmail, type TransporterConfig } from './transporter';

import type { BookingEmailData, RescheduleEmailData, EmailTemplate, EmailTemplateType } from './types';
import { replaceSubjectVariables } from './formatters';
import {
	generateBookingEmail,
	generateBookingEmailText,
	generateCancellationEmail,
	generateAdminCancellationEmail,
	generateRescheduleEmail,
	generateAdminRescheduleEmail,
	generateReminderEmail,
	getDefaultReminderSubject,
	generateAdminNotificationEmail
} from './templates';
import { sendUnifiedEmail } from './transporter';
import type { SmtpConfig } from './smtp-client';

/**
 * Email configuration for sending
 */
export interface EmailConfig {
	apiKey?: string;
	smtp?: SmtpConfig;
	from: string;
	replyTo?: string;
}

/**
 * Send booking confirmation email via SMTP or Emailit API
 */
export async function sendBookingEmail(
	data: BookingEmailData,
	config: EmailConfig & { replyTo: string },
	customSubject?: string
): Promise<void> {
	const htmlBody = generateBookingEmail(data);
	const textBody = generateBookingEmailText(data);
	const subject = customSubject
		? replaceSubjectVariables(customSubject, data)
		: `Meeting Confirmed: ${data.eventName} with ${data.hostName}`;

	await sendUnifiedEmail(
		{
			from: `${data.hostName} <${config.from}>`,
			to: data.attendeeEmail,
			replyTo: config.replyTo,
			subject,
			text: textBody,
			html: htmlBody
		},
		{
			smtp: config.smtp,
			emailItApiKey: config.apiKey,
			from: config.from
		}
	);
}

/**
 * Send cancellation email
 */
export async function sendCancellationEmail(
	data: BookingEmailData,
	config: EmailConfig & { replyTo: string },
	customSubject?: string
): Promise<void> {
	const htmlBody = generateCancellationEmail(data);
	const subject = customSubject
		? replaceSubjectVariables(customSubject, data)
		: `Meeting Cancelled: ${data.eventName}`;

	await sendUnifiedEmail(
		{
			from: `${data.hostName} <${config.from}>`,
			to: data.attendeeEmail,
			replyTo: config.replyTo,
			subject,
			html: htmlBody
		},
		{
			smtp: config.smtp,
			emailItApiKey: config.apiKey,
			from: config.from
		}
	);
}

/**
 * Send reschedule email
 */
export async function sendRescheduleEmail(
	data: RescheduleEmailData,
	config: EmailConfig & { replyTo: string },
	customSubject?: string
): Promise<void> {
	const htmlBody = generateRescheduleEmail(data);
	const subject = customSubject
		? replaceSubjectVariables(customSubject, data)
		: `Meeting Rescheduled: ${data.eventName} with ${data.hostName}`;

	await sendUnifiedEmail(
		{
			from: `${data.hostName} <${config.from}>`,
			to: data.attendeeEmail,
			replyTo: config.replyTo,
			subject,
			html: htmlBody
		},
		{
			smtp: config.smtp,
			emailItApiKey: config.apiKey,
			from: config.from
		}
	);
}

/**
 * Send reminder email
 */
export async function sendReminderEmail(
	data: BookingEmailData,
	reminderType: 'reminder_24h' | 'reminder_1h' | 'reminder_30m',
	config: EmailConfig & { replyTo: string },
	customSubject?: string
): Promise<void> {
	const htmlBody = generateReminderEmail(data, reminderType);
	const subject = customSubject
		? replaceSubjectVariables(customSubject, data)
		: getDefaultReminderSubject(data, reminderType);

	await sendUnifiedEmail(
		{
			from: `${data.hostName} <${config.from}>`,
			to: data.attendeeEmail,
			replyTo: config.replyTo,
			subject,
			html: htmlBody
		},
		{
			smtp: config.smtp,
			emailItApiKey: config.apiKey,
			from: config.from
		}
	);
}

/**
 * Send admin notification email when a booking is made
 */
export async function sendAdminNotificationEmail(
	data: BookingEmailData,
	adminEmail: string,
	config: EmailConfig
): Promise<void> {
	const htmlBody = generateAdminNotificationEmail(data);

	await sendUnifiedEmail(
		{
			from: `CloudMeet <${config.from}>`,
			to: adminEmail,
			subject: `New Booking: ${data.eventName} with ${data.attendeeName}`,
			html: htmlBody
		},
		{
			smtp: config.smtp,
			emailItApiKey: config.apiKey,
			from: config.from
		}
	);
}

/**
 * Send admin notification for cancellation
 */
export async function sendAdminCancellationNotification(
	data: BookingEmailData,
	adminEmail: string,
	config: EmailConfig
): Promise<void> {
	const htmlBody = generateAdminCancellationEmail(data);

	await sendUnifiedEmail(
		{
			from: `CloudMeet <${config.from}>`,
			to: adminEmail,
			subject: `Booking Cancelled: ${data.eventName} with ${data.attendeeName}`,
			html: htmlBody
		},
		{
			smtp: config.smtp,
			emailItApiKey: config.apiKey,
			from: config.from
		}
	);
}

/**
 * Send admin notification for reschedule
 */
export async function sendAdminRescheduleNotification(
	data: RescheduleEmailData,
	adminEmail: string,
	config: EmailConfig
): Promise<void> {
	const htmlBody = generateAdminRescheduleEmail(data);

	await sendUnifiedEmail(
		{
			from: `CloudMeet <${config.from}>`,
			to: adminEmail,
			subject: `Booking Rescheduled: ${data.eventName} with ${data.attendeeName}`,
			html: htmlBody
		},
		{
			smtp: config.smtp,
			emailItApiKey: config.apiKey,
			from: config.from
		}
	);
}

/**
 * Get email templates for a user
 */
export async function getEmailTemplates(
	db: D1Database,
	userId: string
): Promise<Map<EmailTemplateType, EmailTemplate>> {
	const templates = await db
		.prepare(
			'SELECT template_type, is_enabled, subject, custom_message FROM email_templates WHERE user_id = ?'
		)
		.bind(userId)
		.all<{
			template_type: EmailTemplateType;
			is_enabled: number;
			subject: string | null;
			custom_message: string | null;
		}>();

	const map = new Map<EmailTemplateType, EmailTemplate>();
	for (const t of templates.results) {
		map.set(t.template_type, {
			template_type: t.template_type,
			is_enabled: t.is_enabled === 1,
			subject: t.subject,
			custom_message: t.custom_message
		});
	}
	return map;
}

/**
 * Check if a specific email type is enabled
 */
export function isEmailEnabled(
	templates: Map<EmailTemplateType, EmailTemplate>,
	type: EmailTemplateType
): boolean {
	const template = templates.get(type);
	// Default to enabled if no template exists
	return template ? template.is_enabled : true;
}
