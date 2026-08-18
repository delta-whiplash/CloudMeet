/**
 * Consolidated Database Queries using SQL CTEs to minimize D1 Rows Read
 */

export interface ConsolidatedAvailabilityData {
	user_id: string;
	timezone: string | null;
	user_settings: string | null;
	event_type_id: string;
	duration_minutes: number;
	availability_calendars: string | null;
	start_time: string | null;
	end_time: string | null;
}

export function buildSingleQueryAvailabilityParams(eventSlug: string, dayOfWeek: number) {
	const query = `
		WITH target_user AS (
			SELECT id, timezone, settings FROM users LIMIT 1
		),
		target_event AS (
			SELECT event_types.id, duration_minutes, availability_calendars
			FROM event_types, target_user
			WHERE user_id = target_user.id AND slug = ? AND is_active = 1
		)
		SELECT 
			u.id as user_id, u.timezone, u.settings as user_settings,
			e.id as event_type_id, e.duration_minutes, e.availability_calendars,
			ar.start_time, ar.end_time
		FROM target_user u
		JOIN target_event e ON 1=1
		LEFT JOIN availability_rules ar ON ar.user_id = u.id AND ar.day_of_week = ? AND ar.is_active = 1
		ORDER BY ar.start_time
	`;

	return {
		query: query.trim(),
		params: [eventSlug, dayOfWeek]
	};
}
