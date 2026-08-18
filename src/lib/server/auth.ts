/**
 * Server-side authentication utilities for Google OAuth
 * Single-user system - only the owner can log in
 */

import type { RequestEvent } from '@sveltejs/kit';

/**
 * Insecure development-only secret. Only ever used when DASHBOARD_DEMO=1
 * (local dev / CI); production must set JWT_SECRET.
 */
const DEV_JWT_SECRET = 'dev-jwt-secret-key-cloudmeet-local';

function isDemoEnabled(env: App.Platform['env'] | undefined): boolean {
	return env?.DASHBOARD_DEMO === '1';
}

export interface GoogleTokenResponse {
	access_token: string;
	refresh_token?: string;
	expires_in: number;
	token_type: string;
	scope: string;
}

export interface GoogleUserInfo {
	id: string;
	email: string;
	name: string;
	picture: string;
}

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(clientId: string, redirectUri: string, state: string): string {
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: [
			'https://www.googleapis.com/auth/calendar',
			'https://www.googleapis.com/auth/calendar.events',
			'https://www.googleapis.com/auth/userinfo.email',
			'https://www.googleapis.com/auth/userinfo.profile'
		].join(' '),
		access_type: 'offline',
		prompt: 'consent',
		state
	});

	return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
	code: string,
	clientId: string,
	clientSecret: string,
	redirectUri: string
): Promise<GoogleTokenResponse> {
	const response = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			code,
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code'
		})
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to exchange code for tokens: ${error}`);
	}

	return response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
	refreshToken: string,
	clientId: string,
	clientSecret: string
): Promise<GoogleTokenResponse> {
	const response = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			refresh_token: refreshToken,
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: 'refresh_token'
		})
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to refresh access token: ${error}`);
	}

	return response.json();
}

/**
 * Get user info from Google
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
	const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	});

	if (!response.ok) {
		throw new Error('Failed to get user info');
	}

	return response.json();
}

/**
 * Create session token (simple JWT-like token)
 */
export async function createSessionToken(
	userId: string,
	secret?: string
): Promise<string> {
	const effectiveSecret = secret ?? DEV_JWT_SECRET;
	const payload = {
		userId,
		iat: Date.now()
	};

	// Simple base64 encoding with signature
	const data = btoa(JSON.stringify(payload));
	const signature = await hashString(`${data}.${effectiveSecret}`);

	return `${data}.${signature}`;
}

/**
 * Verify session token
 */
export async function verifySessionToken(
	token: string,
	secret?: string
): Promise<{ userId: string } | null> {
	try {
		const effectiveSecret = secret ?? DEV_JWT_SECRET;
		const [data, signature] = token.split('.');
		const expectedSignature = await hashString(`${data}.${effectiveSecret}`);

		if (signature !== expectedSignature) {
			return null;
		}

		const payload = JSON.parse(atob(data));

		// Check if token is expired (7 days - matches cookie maxAge)
		const age = Date.now() - payload.iat;
		if (age > 7 * 24 * 60 * 60 * 1000) {
			return null;
		}

		return { userId: payload.userId };
	} catch {
		return null;
	}
}

/**
 * Hash string using Web Crypto API
 */
async function hashString(str: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(str);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get current user from session cookie
 */
export async function getCurrentUser(
	event: RequestEvent
): Promise<string | null> {
	const sessionToken = event.cookies.get('session');
	if (!sessionToken) {
		return null;
	}

	// Fail closed: without a real JWT_SECRET, sessions only validate in demo mode.
	const jwtSecret =
		event.platform?.env?.JWT_SECRET || (isDemoEnabled(event.platform?.env) ? DEV_JWT_SECRET : null);
	if (!jwtSecret) {
		return null;
	}

	const session = await verifySessionToken(sessionToken, jwtSecret);
	return session?.userId ?? null;
}

/**
 * Create a demo/dev session for local testing when Google OAuth is not configured
 */
export async function createDevSession(
	platform: App.Platform | undefined,
	cookies: any
): Promise<string> {
	const db = platform?.env?.DB;
	if (!db) {
		throw new Error('Database binding (DB) is not available');
	}

	const email = 'demo-admin@cloudmeet.local';
	let user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>();

	let userId: string;
	if (!user) {
		userId = crypto.randomUUID();
		await db
			.prepare(
				`INSERT INTO users (id, email, name, slug, created_at)
				 VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
			)
			.bind(userId, email, 'Admin Demo', 'demo-admin')
			.run();

		// Add default availability (Mon-Fri 9-17)
		for (let day = 1; day <= 5; day++) {
			await db
				.prepare(
					`INSERT OR IGNORE INTO availability_rules (id, user_id, day_of_week, start_time, end_time, is_active)
					 VALUES (?, ?, ?, '09:00', '17:00', 1)`
				)
				.bind(crypto.randomUUID(), userId, day)
				.run();
		}

		// Add default event type
		await db
			.prepare(
				`INSERT OR IGNORE INTO event_types (id, user_id, name, slug, duration_minutes, description, is_active)
				 VALUES (?, ?, '30 Min Meeting', '30min', 30, 'Standard 30-minute consultation', 1)`
			)
			.bind(crypto.randomUUID(), userId)
			.run();
	} else {
		userId = user.id;
	}

	const jwtSecret = platform?.env?.JWT_SECRET || DEV_JWT_SECRET;
	const sessionToken = await createSessionToken(userId, jwtSecret);

	cookies.set('session', sessionToken, {
		path: '/',
		httpOnly: true,
		secure: false,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 7
	});

	return userId;
}

/**
 * Require authentication - redirect to login if not authenticated
 */
export async function requireAuth(event: RequestEvent): Promise<string> {
	const userId = await getCurrentUser(event);
	if (!userId) {
		throw new Error('Not authenticated');
	}
	return userId;
}

