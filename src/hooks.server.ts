import type { Handle, HandleServerError } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const requestId = event.request.headers.get('x-request-id') || crypto.randomUUID();
	event.locals.requestId = requestId;

	const response = await resolve(event);
	response.headers.set('X-Request-Id', requestId);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	return response;
};

export const handleError: HandleServerError = ({ error, event }) => {
	const requestId = event.locals?.requestId || 'unknown';
	console.error(`[Request ${requestId}] Unhandled Error:`, error);

	const errMessage = (error as any)?.message || String(error || '');

	// Detect missing D1 database tables (Issue #31)
	if (errMessage.includes('no such table') || errMessage.includes('D1_ERROR')) {
		return {
			message: 'Database schema is not initialized. Please run "pnpm run db:init" (local) or "pnpm run db:init:remote" (production) to execute schema.sql.',
			code: 'DB_SCHEMA_NOT_INITIALIZED',
			requestId
		};
	}

	return {
		message: 'Internal Error',
		requestId
	};
};
