import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	const status = {
		status: 'ok',
		timestamp: new Date().toISOString(),
		checks: {
			database: { status: 'unknown', message: '' },
			schema: { status: 'unknown', message: '' },
			kv: { status: 'unknown', message: '' },
			environment: { status: 'unknown', missingVars: [] as string[] }
		}
	};

	let isHealthy = true;

	// 1. Check Database connection & Schema
	if (platform?.env?.DB) {
		try {
			await platform.env.DB.prepare('SELECT 1').first();
			status.checks.database.status = 'ok';
			status.checks.database.message = 'D1 Database connection successful';

			try {
				const userCheck = await platform.env.DB.prepare('SELECT count(*) as count FROM users').first();
				status.checks.schema.status = 'ok';
				status.checks.schema.message = `Database schema initialized (${userCheck?.count ?? 0} users found)`;
			} catch (schemaErr: any) {
				status.checks.schema.status = 'error';
				status.checks.schema.message = 'Database schema not initialized. Run "pnpm run db:init" (local) or "pnpm run db:init:remote" (production).';
				isHealthy = false;
			}
		} catch (err: any) {
			status.checks.database.status = 'error';
			status.checks.database.message = `Database query failed: ${err?.message || String(err)}`;
			isHealthy = false;
		}
	} else {
		status.checks.database.status = 'error';
		status.checks.database.message = 'D1 binding (DB) is missing from environment/platform';
		isHealthy = false;
	}

	// 2. Check KV Namespace
	if (platform?.env?.KV) {
		status.checks.kv.status = 'ok';
		status.checks.kv.message = 'KV Namespace binding available';
	} else {
		status.checks.kv.status = 'warn';
		status.checks.kv.message = 'KV Namespace binding missing (caching disabled)';
	}

	// 3. Check Environment Variables
	const requiredVars = ['JWT_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
	const missing = requiredVars.filter(v => !platform?.env?.[v as keyof typeof platform.env]);

	if (missing.length === 0) {
		status.checks.environment.status = 'ok';
	} else {
		status.checks.environment.status = 'warn';
		status.checks.environment.missingVars = missing;
	}

	status.status = isHealthy ? 'ok' : 'error';

	return json(status, { status: isHealthy ? 200 : 503 });
};
