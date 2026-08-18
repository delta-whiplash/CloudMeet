import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getCurrentUser } from '$lib/server/auth';

/**
 * Central auth guard for the entire /dashboard/* subtree.
 * One place to enforce the session check — individual +page.server.ts files
 * keep their own checks as defense-in-depth.
 */
export const load: LayoutServerLoad = async (event) => {
	const userId = await getCurrentUser(event);
	if (!userId) {
		throw redirect(302, '/auth/login');
	}
	return { userId };
};
