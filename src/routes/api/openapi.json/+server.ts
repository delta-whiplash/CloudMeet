/**
 * OpenAPI 3.1.0 Raw JSON Specification Endpoint
 * Protected by admin session authentication - Returns 401 if unauthenticated.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCurrentUser } from '$lib/server/auth';
import { getOpenApiSpec } from '$lib/server/openapi';

export const GET: RequestHandler = async (event) => {
	const userId = await getCurrentUser(event);
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const appUrl = event.platform?.env?.APP_URL || 'https://cloudmeet.pages.dev';
	const spec = getOpenApiSpec(appUrl);

	return json(spec, {
		headers: {
			'Cache-Control': 'no-store, private',
			'Content-Type': 'application/json'
		}
	});
};
