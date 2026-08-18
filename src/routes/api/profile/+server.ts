/**
 * Profile API endpoint
 * Handles profile updates including name, image, and CalDAV/CardDAV/SMTP integration settings.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCurrentUser } from '$lib/server/auth';
import { isValidEmail, validateLength, MAX_LENGTHS } from '$lib/server/validation';

export const PUT: RequestHandler = async (event) => {
	const userId = await getCurrentUser(event);
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const env = event.platform?.env;
	if (!env) {
		throw error(500, 'Platform env not available');
	}

	const db = env.DB;

	try {
		const body = await event.request.json() as {
			name?: string;
			profileImage?: string | null;
			brandColor?: string | null;
			contactEmail?: string | null;
			timeFormat?: '12h' | '24h';
			// Global calendar settings
			defaultAvailabilityCalendars?: 'google' | 'outlook' | 'caldav' | 'both' | 'all';
			defaultInviteCalendar?: 'google' | 'outlook' | 'caldav';
			selectedGoogleCalendars?: string[];
			// CalDAV settings
			caldavUrl?: string | null;
			caldavUsername?: string | null;
			caldavPassword?: string | null;
			caldavCalendarPath?: string | null;
			// CardDAV settings
			carddavUrl?: string | null;
			carddavUsername?: string | null;
			carddavPassword?: string | null;
			// SMTP settings
			smtpHost?: string | null;
			smtpPort?: number | null;
			smtpUsername?: string | null;
			smtpPassword?: string | null;
			smtpSecure?: boolean | null;
			smtpFrom?: string | null;
		};
		const {
			name,
			profileImage,
			brandColor,
			contactEmail,
			timeFormat,
			defaultAvailabilityCalendars,
			defaultInviteCalendar,
			selectedGoogleCalendars,
			caldavUrl,
			caldavUsername,
			caldavPassword,
			caldavCalendarPath,
			carddavUrl,
			carddavUsername,
			carddavPassword,
			smtpHost,
			smtpPort,
			smtpUsername,
			smtpPassword,
			smtpSecure,
			smtpFrom
		} = body;

		// Get existing settings
		const existingUser = await db
			.prepare('SELECT settings FROM users WHERE id = ?')
			.bind(userId)
			.first<{ settings: string | null }>();

		let existingSettings: Record<string, unknown> = {};
		try {
			existingSettings = existingUser?.settings ? JSON.parse(existingUser.settings) : {};
		} catch {
			existingSettings = {};
		}

		// Update CalDAV/CardDAV/SMTP integration columns if provided
		if (
			caldavUrl !== undefined ||
			carddavUrl !== undefined ||
			smtpHost !== undefined
		) {
			await db
				.prepare(
					`UPDATE users SET
						caldav_url = COALESCE(?, caldav_url),
						caldav_username = COALESCE(?, caldav_username),
						caldav_password = COALESCE(?, caldav_password),
						caldav_calendar_path = COALESCE(?, caldav_calendar_path),
						carddav_url = COALESCE(?, carddav_url),
						carddav_username = COALESCE(?, carddav_username),
						carddav_password = COALESCE(?, carddav_password),
						smtp_host = COALESCE(?, smtp_host),
						smtp_port = COALESCE(?, smtp_port),
						smtp_username = COALESCE(?, smtp_username),
						smtp_password = COALESCE(?, smtp_password),
						smtp_secure = COALESCE(?, smtp_secure),
						smtp_from = COALESCE(?, smtp_from)
					WHERE id = ?`
				)
				.bind(
					caldavUrl,
					caldavUsername,
					caldavPassword,
					caldavCalendarPath,
					carddavUrl,
					carddavUsername,
					carddavPassword,
					smtpHost,
					smtpPort,
					smtpUsername,
					smtpPassword,
					smtpSecure !== undefined ? (smtpSecure ? 1 : 0) : null,
					smtpFrom,
					userId
				)
				.run();
		}

		// If this is a calendar settings update (no name provided)
		if (name === undefined && (defaultAvailabilityCalendars !== undefined || defaultInviteCalendar !== undefined || selectedGoogleCalendars !== undefined)) {
			// Update only calendar settings
			const newSettings = {
				...existingSettings,
				defaultAvailabilityCalendars: defaultAvailabilityCalendars ?? existingSettings.defaultAvailabilityCalendars ?? 'both',
				defaultInviteCalendar: defaultInviteCalendar ?? existingSettings.defaultInviteCalendar ?? 'google',
				...(selectedGoogleCalendars !== undefined && { selectedGoogleCalendars })
			};

			await db
				.prepare('UPDATE users SET settings = ? WHERE id = ?')
				.bind(JSON.stringify(newSettings), userId)
				.run();

			return json({ success: true });
		}

		// Profile update with name
		if (!name || name.trim().length === 0) {
			// If name wasn't sent but integration parameters were updated, return success
			if (caldavUrl !== undefined || carddavUrl !== undefined || smtpHost !== undefined) {
				return json({ success: true });
			}
			throw error(400, 'Name is required');
		}

		// Validate input lengths
		const nameLengthError = validateLength(name, 'Name', MAX_LENGTHS.name, true);
		if (nameLengthError) {
			throw error(400, nameLengthError);
		}

		// Validate brand color if provided
		const colorRegex = /^#[0-9A-Fa-f]{6}$/;
		const validBrandColor = brandColor && colorRegex.test(brandColor) ? brandColor : '#7a5828';

		// Validate contact email if provided
		let validContactEmail: string | null = null;
		if (contactEmail) {
			if (!isValidEmail(contactEmail)) {
				throw error(400, 'Invalid contact email address');
			}
			validContactEmail = contactEmail.trim();
		}

		// Build settings JSON preserving calendar settings
		const settings = JSON.stringify({
			...existingSettings,
			timeFormat: timeFormat === '24h' ? '24h' : '12h'
		});

		// Update user profile
		await db
			.prepare('UPDATE users SET name = ?, profile_image = ?, brand_color = ?, contact_email = ?, settings = ? WHERE id = ?')
			.bind(name.trim(), profileImage || null, validBrandColor, validContactEmail, settings, userId)
			.run();

		return json({ success: true });
	} catch (err: any) {
		console.error('Profile update error:', err);
		if (err?.status) throw err;
		throw error(500, 'Failed to update profile');
	}
};

export const POST: RequestHandler = async (event) => {
	const userId = await getCurrentUser(event);
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const env = event.platform?.env;
	if (!env) {
		throw error(500, 'Platform env not available');
	}

	try {
		const formData = await event.request.formData();
		const file = formData.get('image') as File;

		if (!file || file.size === 0) {
			throw error(400, 'No image provided');
		}

		// Check file type
		if (!file.type.startsWith('image/')) {
			throw error(400, 'File must be an image');
		}

		// Check file size (max 2MB)
		if (file.size > 2 * 1024 * 1024) {
			throw error(400, 'Image must be less than 2MB');
		}

		// Convert to base64 data URL for storage
		const buffer = await file.arrayBuffer();
		const bytes = new Uint8Array(buffer);

		let binary = '';
		const chunkSize = 8192;
		for (let i = 0; i < bytes.length; i += chunkSize) {
			const chunk = bytes.subarray(i, i + chunkSize);
			binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
		}
		const base64 = btoa(binary);
		const dataUrl = `data:${file.type};base64,${base64}`;

		await env.DB
			.prepare('UPDATE users SET profile_image = ? WHERE id = ?')
			.bind(dataUrl, userId)
			.run();

		return json({ success: true, imageUrl: dataUrl });
	} catch (err: any) {
		console.error('Image upload error:', err);
		if (err?.status) throw err;
		throw error(500, 'Failed to upload image');
	}
};
