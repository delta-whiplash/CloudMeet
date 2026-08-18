import { describe, it, expect } from 'vitest';
import {
	encodeSmtpPlainAuth,
	encodeSmtpBase64,
	parseSmtpResponse,
	type SmtpConfig
} from '../../src/lib/server/email/smtp-client';

describe('SMTP Client & Protocol Module', () => {
	const sampleConfig: SmtpConfig = {
		host: 'mail.smtp-provider.com',
		port: 587,
		username: 'user@example.com',
		password: 'mypassword',
		secure: false,
		from: 'no-reply@example.com'
	};

	describe('encodeSmtpBase64', () => {
		it('encodes string into base64', () => {
			expect(encodeSmtpBase64('user@example.com')).toBe('dXNlckBleGFtcGxlLmNvbQ==');
		});
	});

	describe('encodeSmtpPlainAuth', () => {
		it('encodes PLAIN SASL auth payload (\\0user\\0pass)', () => {
			const encoded = encodeSmtpPlainAuth('user@example.com', 'mypassword');
			// \0user@example.com\0mypassword -> base64
			expect(encoded).toBe('AHVzZXJAZXhhbXBsZS5jb20AbXlwYXNzd29yZA==');
		});
	});

	describe('parseSmtpResponse', () => {
		it('extracts status code and message from SMTP server responses', () => {
			const res1 = parseSmtpResponse('220 mail.example.com ESMTP Service Ready\r\n');
			expect(res1.code).toBe(220);
			expect(res1.isOk).toBe(true);

			const res2 = parseSmtpResponse('250-mail.example.com Hello\r\n250-SIZE 35651584\r\n250 AUTH LOGIN PLAIN\r\n');
			expect(res2.code).toBe(250);
			expect(res2.isOk).toBe(true);

			const res3 = parseSmtpResponse('535 5.7.8 Authentication failed\r\n');
			expect(res3.code).toBe(535);
			expect(res3.isOk).toBe(false);
		});
	});
});
