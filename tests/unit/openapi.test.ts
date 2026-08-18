import { describe, it, expect, vi } from 'vitest';
import { getOpenApiSpec } from '../../src/lib/server/openapi';
import { GET as getOpenApiJson } from '../../src/routes/api/openapi.json/+server';
import { GET as getDocsHtml } from '../../src/routes/api/docs/+server';

vi.mock('../../src/lib/server/auth', () => ({
	getCurrentUser: vi.fn(async (event) => {
		if (event.request.headers.get('Authorization') === 'Bearer valid-session') {
			return 'user-123';
		}
		return null;
	})
}));

describe('OpenAPI 3.1.0 Specification Module', () => {
	it('generates a valid OpenAPI 3.1.0 specification object', () => {
		const spec = getOpenApiSpec();

		expect(spec).toBeDefined();
		expect(spec.openapi).toBe('3.1.0');
		expect(spec.info).toBeDefined();
		expect(spec.info.title).toBe('CloudMeet API');
		expect(spec.info.version).toBe('1.0.0');
	});

	it('includes all system, booking, profile, integration, and auth endpoints', () => {
		const spec = getOpenApiSpec();
		const paths = spec.paths;

		expect(paths['/api/health']).toBeDefined();
		expect(paths['/api/availability']).toBeDefined();
		expect(paths['/api/availability/month']).toBeDefined();
		expect(paths['/api/event-type/{slug}']).toBeDefined();
		expect(paths['/api/bookings']).toBeDefined();
		expect(paths['/api/bookings/cancel']).toBeDefined();
		expect(paths['/api/bookings/propose-reschedule']).toBeDefined();
		expect(paths['/api/bookings/reschedule']).toBeDefined();
		expect(paths['/api/calendars/google']).toBeDefined();
		expect(paths['/api/email-templates']).toBeDefined();
		expect(paths['/api/profile']).toBeDefined();
		expect(paths['/api/integrations/test-caldav']).toBeDefined();
		expect(paths['/api/integrations/test-smtp']).toBeDefined();
		expect(paths['/api/cron/send-reminders']).toBeDefined();
		expect(paths['/auth/logout']).toBeDefined();
		expect(paths['/auth/callback']).toBeDefined();
		expect(paths['/auth/outlook']).toBeDefined();
		expect(paths['/auth/outlook/callback']).toBeDefined();
		expect(paths['/auth/outlook/disconnect']).toBeDefined();
		expect(paths['/api/docs']).toBeDefined();
		expect(paths['/api/openapi.json']).toBeDefined();
	});

	it('defines security schemes for session cookie and cron bearer token', () => {
		const spec = getOpenApiSpec();
		const securitySchemes = spec.components?.securitySchemes;

		expect(securitySchemes).toBeDefined();
		expect(securitySchemes?.cookieAuth).toBeDefined();
		expect(securitySchemes?.bearerAuth).toBeDefined();
	});

	it('defines reusable component schemas for domain entities', () => {
		const spec = getOpenApiSpec();
		const schemas = spec.components?.schemas;

		expect(schemas).toBeDefined();
		expect(schemas?.BookingRequest).toBeDefined();
		expect(schemas?.BookingResponse).toBeDefined();
		expect(schemas?.UserProfile).toBeDefined();
		expect(schemas?.CaldavConfig).toBeDefined();
		expect(schemas?.SmtpConfig).toBeDefined();
		expect(schemas?.HealthStatus).toBeDefined();
		expect(schemas?.ErrorResponse).toBeDefined();
	});

	describe('Documentation Security & Access Control', () => {
		it('GET /api/openapi.json returns 401 Unauthorized for unauthenticated requests', async () => {
			const mockEvent: any = {
				request: { headers: new Headers() },
				platform: { env: {} }
			};

			await expect(getOpenApiJson(mockEvent)).rejects.toMatchObject({
				status: 401
			});
		});

		it('GET /api/openapi.json returns JSON spec for authenticated admin session', async () => {
			const mockEvent: any = {
				request: { headers: new Headers({ Authorization: 'Bearer valid-session' }) },
				platform: { env: { APP_URL: 'https://cloudmeet.pages.dev' } }
			};

			const response = await getOpenApiJson(mockEvent);
			expect(response.status).toBe(200);

			const json = (await response.json()) as any;
			expect(json.openapi).toBe('3.1.0');
			expect(json.info.title).toBe('CloudMeet API');
		});

		it('GET /api/docs redirects unauthenticated requests to /auth/login', async () => {
			const mockEvent: any = {
				request: { headers: new Headers() },
				platform: { env: {} }
			};

			await expect(getDocsHtml(mockEvent)).rejects.toMatchObject({
				status: 302,
				location: '/auth/login'
			});
		});

		it('GET /api/docs serves Swagger UI HTML page for authenticated admin session', async () => {
			const mockEvent: any = {
				request: { headers: new Headers({ Authorization: 'Bearer valid-session' }) },
				platform: { env: {} }
			};

			const response = await getDocsHtml(mockEvent);
			expect(response.status).toBe(200);

			const html = await response.text();
			expect(html).toContain('SwaggerUIBundle');
			expect(html).toContain('/api/openapi.json');
		});
	});
});
