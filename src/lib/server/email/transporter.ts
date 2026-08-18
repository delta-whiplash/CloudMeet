/**
 * Unified Email Transporter
 * Dispatches emails through SMTP (standard), EmailIt (API), or Console (mock/dev).
 */

import { SmtpClient, type SmtpConfig } from './smtp-client';
import type { MimeEmailOptions } from './mime';

export interface TransporterConfig {
	smtp?: SmtpConfig;
	emailItApiKey?: string;
	from?: string;
}

export interface CustomTransporterSenders {
	smtpSend?: (data: MimeEmailOptions, config: SmtpConfig) => Promise<void>;
	emailItSend?: (data: MimeEmailOptions, apiKey: string) => Promise<void>;
}

/**
 * Dispatch an email through the active provider (SMTP > EmailIt > Mock)
 */
export async function sendUnifiedEmail(
	data: MimeEmailOptions,
	config: TransporterConfig,
	customSenders?: CustomTransporterSenders
): Promise<void> {
	if (config.smtp && config.smtp.host) {
		if (customSenders?.smtpSend) {
			await customSenders.smtpSend(data, config.smtp);
		} else {
			const client = new SmtpClient(config.smtp);
			await client.send(data);
		}
		return;
	}

	if (config.emailItApiKey) {
		if (customSenders?.emailItSend) {
			await customSenders.emailItSend(data, config.emailItApiKey);
		} else {
			const fromAddr = typeof data.from === 'string' ? data.from : data.from.email;
			const toAddr = typeof data.to === 'string' ? data.to : data.to.email;
			const replyToAddr = data.replyTo ? (typeof data.replyTo === 'string' ? data.replyTo : data.replyTo.email) : undefined;

			const response = await fetch('https://api.emailit.com/v2/emails', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${config.emailItApiKey}`
				},
				body: JSON.stringify({
					from: fromAddr,
					to: toAddr,
					reply_to: replyToAddr,
					subject: data.subject,
					text: data.text,
					html: data.html
				})
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(`EmailIt API error: ${error}`);
			}
		}
		return;
	}

	// Console fallback for local development or unconfigured email
	console.log(`[Mock Email] To: ${typeof data.to === 'string' ? data.to : data.to.email} | Subject: ${data.subject}`);
}
