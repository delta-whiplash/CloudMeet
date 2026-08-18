/**
 * Dashboard page - shows event types, recent bookings, and integrations
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCurrentUser } from '$lib/server/auth';

export const load: PageServerLoad = async (event) => {
	const userId = await getCurrentUser(event);

	if (!userId) {
		throw redirect(302, '/auth/login');
	}

	const db = event.platform?.env?.DB;
	if (!db) {
		throw new Error('Database not available');
	}

	// Get user info including open standard integrations
	const user = await db
		.prepare(`SELECT id, email, name, slug, profile_image, brand_color, settings, contact_email,
			caldav_url as caldavUrl, caldav_username as caldavUsername, caldav_password as caldavPassword, caldav_calendar_path as caldavCalendarPath,
			carddav_url as carddavUrl, carddav_username as carddavUsername, carddav_password as carddavPassword,
			smtp_host as smtpHost, smtp_port as smtpPort, smtp_username as smtpUsername, smtp_password as smtpPassword, smtp_secure as smtpSecure, smtp_from as smtpFrom
			FROM users WHERE id = ?`)
		.bind(userId)
		.first<{
			id: string;
			email: string;
			name: string;
			slug: string;
			profile_image: string | null;
			brand_color: string | null;
			settings: string | null;
			contact_email: string | null;
			caldavUrl: string | null;
			caldavUsername: string | null;
			caldavPassword: string | null;
			caldavCalendarPath: string | null;
			carddavUrl: string | null;
			carddavUsername: string | null;
			carddavPassword: string | null;
			smtpHost: string | null;
			smtpPort: number | null;
			smtpUsername: string | null;
			smtpPassword: string | null;
			smtpSecure: number | null;
			smtpFrom: string | null;
		}>();

	// Get event types
	const eventTypes = await db
		.prepare(
			`SELECT id, name, slug, duration_minutes as duration, description, is_active
			FROM event_types
			WHERE user_id = ?
			ORDER BY name ASC`
		)
		.bind(userId)
		.all<{
			id: string;
			name: string;
			slug: string;
			duration: number;
			description: string;
			is_active: number;
		}>();

	// Get upcoming bookings
	const recentBookings = await db
		.prepare(
			`SELECT b.id, b.start_time, b.end_time, b.attendee_name, b.attendee_email,
				b.status, b.created_at, b.attendee_notes, b.canceled_by, b.cancellation_reason,
				b.event_type_id, et.name as event_type_name, et.slug as event_type_slug, et.duration_minutes
			FROM bookings b
			JOIN event_types et ON b.event_type_id = et.id
			WHERE b.user_id = ? AND b.start_time >= datetime('now')
			ORDER BY b.created_at DESC
			LIMIT 20`
		)
		.bind(userId)
		.all<{
			id: string;
			start_time: string;
			end_time: string;
			attendee_name: string;
			attendee_email: string;
			status: string;
			created_at: string;
			event_type_name: string;
			event_type_slug: string;
			event_type_id: string;
			duration_minutes: number;
			attendee_notes: string | null;
			canceled_by: string | null;
			cancellation_reason: string | null;
		}>();

	const appUrl = event.platform?.env?.APP_URL || '';

	return {
		user,
		eventTypes: eventTypes.results,
		recentBookings: recentBookings.results,
		appUrl
	};
};
