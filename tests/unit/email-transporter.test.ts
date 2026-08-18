import { describe, it, expect, vi } from 'vitest';
import {
	sendUnifiedEmail,
	type TransporterConfig
} from '../../src/lib/server/email/transporter';

describe('Unified Email Transporter Module', () => {
	const sampleEmailData = {
		from: 'host@example.com',
		to: 'attendee@example.com',
		subject: 'Test Email',
		text: 'Hello world',
		html: '<p>Hello world</p>'
	};

	it('routes email via SMTP when SMTP configuration is provided', async () => {
		const config: TransporterConfig = {
			smtp: {
				host: 'smtp.mailtrap.io',
				port: 587,
				username: 'user',
				password: 'pass',
				from: 'host@example.com'
			}
		};

		const spySmtpSend = vi.fn().mockResolvedValue(undefined);
		const spyEmailItSend = vi.fn();

		await sendUnifiedEmail(sampleEmailData, config, {
			smtpSend: spySmtpSend,
			emailItSend: spyEmailItSend
		});

		expect(spySmtpSend).toHaveBeenCalledOnce();
		expect(spyEmailItSend).not.toHaveBeenCalled();
	});

	it('routes email via EmailIt API when no SMTP config exists but EmailIt API key is present', async () => {
		const config: TransporterConfig = {
			emailItApiKey: 'emailit-secret-key'
		};

		const spySmtpSend = vi.fn();
		const spyEmailItSend = vi.fn().mockResolvedValue(undefined);

		await sendUnifiedEmail(sampleEmailData, config, {
			smtpSend: spySmtpSend,
			emailItSend: spyEmailItSend
		});

		expect(spyEmailItSend).toHaveBeenCalledOnce();
		expect(spySmtpSend).not.toHaveBeenCalled();
	});

	it('falls back gracefully to console mode when no providers are configured', async () => {
		const config: TransporterConfig = {};

		const spySmtpSend = vi.fn();
		const spyEmailItSend = vi.fn();
		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		await sendUnifiedEmail(sampleEmailData, config, {
			smtpSend: spySmtpSend,
			emailItSend: spyEmailItSend
		});

		expect(spySmtpSend).not.toHaveBeenCalled();
		expect(spyEmailItSend).not.toHaveBeenCalled();
		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Mock Email]'));

		consoleSpy.mockRestore();
	});
});
