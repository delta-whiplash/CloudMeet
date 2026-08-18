import { test, expect } from '@playwright/test';

test.describe('Health Endpoint E2E Non-Regression', () => {
	test('GET /api/health returns 200 OK and valid health payload', async ({ request }) => {
		const response = await request.get('/api/health');
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body.status).toBe('ok');
		expect(body.checks.database.status).toBe('ok');
		expect(body.checks.schema.status).toBe('ok');
	});
});
