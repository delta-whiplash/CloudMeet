/**
 * RFC 5322 MIME Message Builder
 * Generates RFC 5322 formatted emails with multipart text, HTML, and optional iCalendar attachments.
 * Compatible with Cloudflare Workers.
 */

export interface MimeAddress {
	name?: string;
	email: string;
}

export interface IcsAttachment {
	filename: string;
	content: string;
}

export interface MimeEmailOptions {
	from: string | MimeAddress;
	to: string | MimeAddress;
	replyTo?: string | MimeAddress;
	subject: string;
	text?: string;
	html?: string;
	icsAttachment?: IcsAttachment;
}

function formatAddress(addr: string | MimeAddress): string {
	if (typeof addr === 'string') {
		return addr;
	}
	return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
}

/**
 * Generate random MIME boundary identifier
 */
function generateBoundary(): string {
	const random = Math.random().toString(36).substring(2, 12);
	return `----=_NextPart_${Date.now()}_${random}`;
}

/**
 * Build RFC 5322 MIME email string
 */
export function buildMimeMessage(options: MimeEmailOptions): string {
	const boundaryAlt = generateBoundary() + '_alt';
	const boundaryMixed = generateBoundary() + '_mixed';
	const hasAttachment = !!options.icsAttachment;

	const fromHeader = formatAddress(options.from);
	const toHeader = formatAddress(options.to);
	const dateHeader = new Date().toUTCString();
	const msgIdHeader = `<${Date.now()}.${Math.random().toString(36).substring(2)}@cloudmeet>`;

	const headers: string[] = [
		`From: ${fromHeader}`,
		`To: ${toHeader}`,
		`Subject: ${options.subject}`,
		`Date: ${dateHeader}`,
		`Message-ID: ${msgIdHeader}`,
		`MIME-Version: 1.0`
	];

	if (options.replyTo) {
		headers.push(`Reply-To: ${formatAddress(options.replyTo)}`);
	}

	const topBoundary = hasAttachment ? boundaryMixed : boundaryAlt;
	const topContentType = hasAttachment
		? `Content-Type: multipart/mixed; boundary="${boundaryMixed}"`
		: `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`;

	headers.push(topContentType);

	const bodyParts: string[] = [];

	if (hasAttachment) {
		bodyParts.push(`--${boundaryMixed}`);
		bodyParts.push(`Content-Type: multipart/alternative; boundary="${boundaryAlt}"\r\n`);
	}

	// Plain text part
	if (options.text) {
		bodyParts.push(`--${boundaryAlt}`);
		bodyParts.push('Content-Type: text/plain; charset=utf-8');
		bodyParts.push('Content-Transfer-Encoding: 8bit\r\n');
		bodyParts.push(options.text);
	}

	// HTML part
	if (options.html) {
		bodyParts.push(`--${boundaryAlt}`);
		bodyParts.push('Content-Type: text/html; charset=utf-8');
		bodyParts.push('Content-Transfer-Encoding: 8bit\r\n');
		bodyParts.push(options.html);
	}

	bodyParts.push(`--${boundaryAlt}--`);

	// Attachment part
	if (hasAttachment && options.icsAttachment) {
		bodyParts.push(`--${boundaryMixed}`);
		bodyParts.push(`Content-Type: text/calendar; method=REQUEST; charset=utf-8; name="${options.icsAttachment.filename}"`);
		bodyParts.push(`Content-Disposition: attachment; filename="${options.icsAttachment.filename}"`);
		bodyParts.push('Content-Transfer-Encoding: 8bit\r\n');
		bodyParts.push(options.icsAttachment.content);
		bodyParts.push(`--${boundaryMixed}--`);
	}

	return [...headers, '', ...bodyParts].join('\r\n');
}
