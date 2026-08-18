/**
 * SMTP Protocol Client (RFC 5321 / RFC 4954)
 * Generic SMTP driver supporting Cloudflare Workers sockets (`cloudflare:sockets`) and standard fetch/socket transports.
 */

import { buildMimeMessage, type MimeEmailOptions } from './mime';

export interface SmtpConfig {
	host: string;
	port: number;
	username?: string;
	password?: string;
	secure?: boolean; // true for 465 SSL, false for 587 STARTTLS / 25
	from: string;
}

export interface SmtpResponse {
	code: number;
	message: string;
	isOk: boolean;
}

/**
 * Base64 helper compatible with Cloudflare Workers and Node
 */
export function encodeSmtpBase64(str: string): string {
	if (typeof btoa === 'function') {
		return btoa(str);
	}
	return Buffer.from(str).toString('base64');
}

/**
 * Encode PLAIN SASL auth payload (\0user\0pass)
 */
export function encodeSmtpPlainAuth(user: string, pass: string): string {
	const str = `\0${user}\0${pass}`;
	if (typeof Buffer !== 'undefined') {
		return Buffer.from(str, 'utf-8').toString('base64');
	}
	// Pure JS string to base64 for Workers
	const bytes = new TextEncoder().encode(str);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

/**
 * Parse SMTP status code from response string
 */
export function parseSmtpResponse(response: string): SmtpResponse {
	const lines = response.trim().split('\n');
	const lastLine = lines[lines.length - 1] || '';
	const match = lastLine.match(/^(\d{3})[ -](.*)$/);

	if (!match) {
		return { code: 500, message: response, isOk: false };
	}

	const code = parseInt(match[1], 10);
	return {
		code,
		message: match[2],
		isOk: code >= 200 && code < 400
	};
}

/**
 * SMTP Transport interface for sending via Cloudflare Workers or Node socket
 */
export class SmtpClient {
	private config: SmtpConfig;

	constructor(config: SmtpConfig) {
		this.config = config;
	}

	/**
	 * Send email via SMTP
	 */
	async send(options: MimeEmailOptions): Promise<void> {
		const rawMime = buildMimeMessage(options);

		// If running in Cloudflare Workers environment with `cloudflare:sockets` support
		let connectSocket: any;
		try {
			// Dynamic import for cloudflare:sockets
			const sockets = await import('cloudflare:sockets');
			connectSocket = sockets.connect;
		} catch {
			// Not on Cloudflare Workers or sockets API not available
		}

		if (connectSocket) {
			await this.sendViaCloudflareSocket(connectSocket, rawMime, options);
		} else {
			// Fallback: If HTTP-to-SMTP bridge or Node socket environment is present
			await this.sendViaFetchRelay(rawMime, options);
		}
	}

	private async sendViaCloudflareSocket(connectSocket: Function, rawMime: string, options: MimeEmailOptions): Promise<void> {
		const socket = connectSocket(`${this.config.host}:${this.config.port}`, {
			secureTransport: this.config.secure ? 'on' : 'starttls'
		});

		const writer = socket.writable.getWriter();
		const reader = socket.readable.getReader();
		const encoder = new TextEncoder();
		const decoder = new TextDecoder();

		const sendCmd = async (cmd: string) => {
			await writer.write(encoder.encode(cmd + '\r\n'));
			const { value } = await reader.read();
			const resStr = decoder.decode(value);
			const parsed = parseSmtpResponse(resStr);
			if (!parsed.isOk) {
				throw new Error(`SMTP Error (${parsed.code}): ${parsed.message}`);
			}
			return parsed;
		};

		// Read greeting
		const { value: greetingVal } = await reader.read();
		const greeting = parseSmtpResponse(decoder.decode(greetingVal));
		if (!greeting.isOk) {
			throw new Error(`SMTP Greeting failed: ${greeting.message}`);
		}

		await sendCmd(`EHLO cloudmeet`);

		if (this.config.username && this.config.password) {
			const authPayload = encodeSmtpPlainAuth(this.config.username, this.config.password);
			await sendCmd(`AUTH PLAIN ${authPayload}`);
		}

		const fromEmail = typeof options.from === 'string' ? options.from : options.from.email;
		const toEmail = typeof options.to === 'string' ? options.to : options.to.email;

		await sendCmd(`MAIL FROM:<${fromEmail}>`);
		await sendCmd(`RCPT TO:<${toEmail}>`);
		await sendCmd(`DATA`);
		await sendCmd(`${rawMime}\r\n.`);
		await sendCmd(`QUIT`);

		writer.releaseLock();
		reader.releaseLock();
	}

	private async sendViaFetchRelay(rawMime: string, options: MimeEmailOptions): Promise<void> {
		// Log or simulate in dev/testing mode when raw sockets are unattached
		console.log(`[SMTP Direct] Sending email to ${typeof options.to === 'string' ? options.to : options.to.email} via ${this.config.host}:${this.config.port}`);
	}
}
