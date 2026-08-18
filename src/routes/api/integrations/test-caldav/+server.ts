/**
 * API endpoint to test CalDAV server connection
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCurrentUser } from '$lib/server/auth';
import { CalDavClient } from '$lib/server/caldav/caldav-client';

export const POST: RequestHandler = async (event) => {
	const userId = await getCurrentUser(event);
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		const body = await event.request.json() as {
			serverUrl: string;
			username: string;
			password: string;
			calendarPath?: string;
		};

		if (!body.serverUrl || !body.username || !body.password) {
			throw error(400, 'Server URL, username, and password are required');
		}

		const client = new CalDavClient({
			serverUrl: body.serverUrl,
			username: body.username,
			password: body.password,
			calendarPath: body.calendarPath
		});

		const success = await client.testConnection();

		if (success) {
			return json({ success: true, message: 'CalDAV connection successful!' });
		} else {
			return json({ success: false, message: 'Could not connect to CalDAV server. Check URL and credentials.' }, { status: 400 });
		}
	} catch (err: any) {
		console.error('CalDAV test error:', err);
		if (err?.status) throw err;
		throw error(500, 'Failed to test CalDAV connection');
	}
};
