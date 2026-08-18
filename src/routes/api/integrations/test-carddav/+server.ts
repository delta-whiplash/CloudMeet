/**
 * API endpoint to test CardDAV server connection
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCurrentUser } from '$lib/server/auth';
import { CardDavClient } from '$lib/server/carddav/carddav-client';

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
			addressBookPath?: string;
		};

		if (!body.serverUrl || !body.username || !body.password) {
			throw error(400, 'Server URL, username, and password are required');
		}

		const client = new CardDavClient({
			serverUrl: body.serverUrl,
			username: body.username,
			password: body.password,
			addressBookPath: body.addressBookPath
		});

		const success = await client.testConnection();

		if (success) {
			return json({ success: true, message: 'CardDAV connection successful!' });
		} else {
			return json({ success: false, message: 'Could not connect to CardDAV server. Check URL and credentials.' }, { status: 400 });
		}
	} catch (err: any) {
		console.error('CardDAV test error:', err);
		if (err?.status) throw err;
		throw error(500, 'Failed to test CardDAV connection');
	}
};
