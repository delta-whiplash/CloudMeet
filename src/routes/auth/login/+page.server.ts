import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getAuthUrl, createDevSession, getCurrentUser } from '$lib/server/auth';

export const load: PageServerLoad = async (event) => {
	const userId = await getCurrentUser(event);
	if (userId) {
		throw redirect(302, '/dashboard');
	}

	const env = event.platform?.env;
	const clientId = env?.GOOGLE_CLIENT_ID;
	const appUrl = env?.APP_URL || event.url.origin;

	const hasOauthConfig = Boolean(clientId && appUrl);

	// If direct google auth trigger requested and configured
	if (event.url.searchParams.get('direct') === 'true' && hasOauthConfig && clientId && env?.KV) {
		const state = crypto.randomUUID();
		await env.KV.put(`oauth_state:${state}`, '1', { expirationTtl: 600 });
		const redirectUri = `${appUrl}/auth/callback`;
		const authUrl = getAuthUrl(clientId, redirectUri, state);
		throw redirect(302, authUrl);
	}

	return {
		hasOauthConfig,
		// The demo/instant-dev login is opt-in via DASHBOARD_DEMO=1 (disabled by default,
		// including in production where OAuth isn't configured yet).
		demoEnabled: env?.DASHBOARD_DEMO === '1'
	};
};

export const actions: Actions = {
	google: async ({ platform, url }) => {
		const env = platform?.env;
		const clientId = env?.GOOGLE_CLIENT_ID;
		const appUrl = env?.APP_URL || url.origin;

		if (!clientId || !appUrl) {
			return fail(400, {
				missingConfig: true,
				message: 'Google OAuth configuration is missing (GOOGLE_CLIENT_ID or APP_URL not defined).'
			});
		}

		const state = crypto.randomUUID();
		if (env?.KV) {
			await env.KV.put(`oauth_state:${state}`, '1', { expirationTtl: 600 });
		}

		const redirectUri = `${appUrl}/auth/callback`;
		const authUrl = getAuthUrl(clientId, redirectUri, state);
		throw redirect(302, authUrl);
	},

	devLogin: async ({ platform, cookies }) => {
		if (platform?.env?.DASHBOARD_DEMO !== '1') {
			return fail(403, {
				error: true,
				message: 'Demo login is disabled. Set DASHBOARD_DEMO=1 to enable it.'
			});
		}
		try {
			await createDevSession(platform, cookies);
			throw redirect(302, '/dashboard');
		} catch (err: any) {
			if (err?.status && err?.location) {
				throw err;
			}
			return fail(500, {
				error: true,
				message: err?.message || 'Failed to create local dev session'
			});
		}
	}
};
