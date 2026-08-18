import { describe, it, expect } from 'vitest';
import { resolveEmailTransport } from '../../src/lib/server/email/index';

function mockDb(row: unknown) {
	return {
		prepare: () => ({
			bind: () => ({
				first: async () => row
			})
		})
	} as any;
}

const noEnv = {} as any;

describe('resolveEmailTransport (src/lib/server/email/index.ts)', () => {
	it('prefers profile SMTP settings over environment', async () => {
		const db = mockDb({
			email: 'host@example.com',
			smtp_host: 'smtp.example.com',
			smtp_port: 465,
			smtp_username: 'user',
			smtp_password: 'pass',
			smtp_secure: 1,
			smtp_from: 'no-reply@example.com'
		});
		const env = { SMTP_HOST: 'env-smtp.example.com', EMAILIT_API_KEY: 'ek', EMAIL_FROM: 'env@x.com' } as any;

		const transport = await resolveEmailTransport(db, 'user-1', env);

		expect(transport.smtp).toBeDefined();
		expect(transport.smtp!.host).toBe('smtp.example.com');
		expect(transport.smtp!.port).toBe(465);
		expect(transport.smtp!.secure).toBe(true);
		expect(transport.smtp!.from).toBe('no-reply@example.com');
		expect(transport.from).toBe('no-reply@example.com');
		expect(transport.apiKey).toBe('ek');
	});

	it('falls back to environment SMTP when the profile has none', async () => {
		const db = mockDb({
			email: 'host@example.com',
			smtp_host: null,
			smtp_port: null,
			smtp_username: null,
			smtp_password: null,
			smtp_secure: null,
			smtp_from: null
		});
		const env = { SMTP_HOST: 'env-smtp.example.com', SMTP_PORT: '2525', SMTP_SECURE: 'true', EMAIL_FROM: 'env@x.com' } as any;

		const transport = await resolveEmailTransport(db, 'user-1', env);

		expect(transport.smtp).toBeDefined();
		expect(transport.smtp!.host).toBe('env-smtp.example.com');
		expect(transport.smtp!.port).toBe(2525);
		expect(transport.smtp!.secure).toBe(true);
		expect(transport.from).toBe('env@x.com');
	});

	it('returns no SMTP and only EmailIt when nothing is configured', async () => {
		const db = mockDb({
			email: 'host@example.com',
			smtp_host: null,
			smtp_port: null,
			smtp_username: null,
			smtp_password: null,
			smtp_secure: null,
			smtp_from: null
		});

		const transport = await resolveEmailTransport(db, 'user-1', noEnv);

		expect(transport.smtp).toBeUndefined();
		expect(transport.apiKey).toBeUndefined();
		expect(transport.from).toBe('host@example.com');
	});

	it('uses the host email as sender when no from is configured anywhere', async () => {
		const db = mockDb(null);

		const transport = await resolveEmailTransport(db, 'missing', noEnv);

		expect(transport.smtp).toBeUndefined();
		expect(transport.from).toBe('');
	});
});
