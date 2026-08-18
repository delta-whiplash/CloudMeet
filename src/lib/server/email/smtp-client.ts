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
		let socket = connectSocket(`${this.config.host}:${this.config.port}`, {
			secureTransport: this.config.secure ? 'on' : 'starttls'
		});

		let writer = socket.writable.getWriter();
		let reader = socket.readable.getReader();
		const encoder = new TextEncoder();
		const decoder = new TextDecoder();

		// A reply is complete when one of its lines starts with "ddd " (space),
		// as opposed to continuation lines "ddd-".
		const isCompleteReply = (buf: string) => buf.split(/\r?\n/).some((l) => /^\d{3} /.test(l));

		const readReply = async (): Promise<string> => {
			let buffer = '';
			for (let reads = 0; reads < 50 && !isCompleteReply(buffer); reads++) {
				const { value, done } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value);
			}
			return buffer;
		};

		const sendCmd = async (cmd: string): Promise<string> => {
			await writer.write(encoder.encode(cmd + '\r\n'));
			const raw = await readReply();
			const parsed = parseSmtpResponse(raw);
			if (!parsed.isOk) {
				throw new Error(`SMTP Error (${parsed.code}): ${parsed.message}`);
			}
			return raw;
		};

		// Read greeting
		const greeting = parseSmtpResponse(await readReply());
		if (!greeting.isOk) {
			throw new Error(`SMTP Greeting failed: ${greeting.message}`);
		}

		const ehloReply = await sendCmd(`EHLO cloudmeet`);

		// Opportunistic STARTTLS on plaintext connections (RFC 3207)
		if (!this.config.secure && ehloReply.toUpperCase().includes('STARTTLS')) {
			await writer.write(encoder.encode('STARTTLS\r\n'));
			const tlsAck = parseSmtpResponse(await readReply());
			if (!tlsAck.isOk) {
				throw new Error(`STARTTLS rejected (${tlsAck.code}): ${tlsAck.message}`);
			}
			writer.releaseLock();
			reader.releaseLock();
			socket = socket.startTls();
			writer = socket.writable.getWriter();
			reader = socket.readable.getReader();
			await sendCmd(`EHLO cloudmeet`);
		}

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
		// No raw-socket transport outside the Workers runtime: fail loudly
		// instead of pretending the email was delivered. Local development can
		// use the EmailIt provider or the console mock transport instead.
		const to = typeof options.to === 'string' ? options.to : options.to.email;
		throw new Error(
			`SMTP direct send requires the Cloudflare Workers runtime (cloudflare:sockets) — cannot deliver to ${to} via ${this.config.host}:${this.config.port}`
		);
	}
}
