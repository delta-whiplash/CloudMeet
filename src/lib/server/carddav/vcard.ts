/**
 * vCard (RFC 6350) generator and parser
 * Compatible with Cloudflare Workers.
 */

export interface CardDavContact {
	uid: string;
	fullName: string;
	givenName?: string;
	familyName?: string;
	email: string;
	phone?: string;
	note?: string;
	rev?: Date;
}

/**
 * Escape text fields for vCard (RFC 6350)
 */
export function escapeVCardText(str: string): string {
	return str
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r?\n/g, '\\n');
}

/**
 * Unescape text fields from vCard
 */
export function unescapeVCardText(str: string): string {
	return str
		.replace(/\\n/gi, '\n')
		.replace(/\\,/g, ',')
		.replace(/\\;/g, ';')
		.replace(/\\\\/g, '\\');
}

/**
 * Generate RFC 6350 vCard string
 */
export function generateVCard(contact: CardDavContact): string {
	const family = contact.familyName || '';
	const given = contact.givenName || contact.fullName;

	const lines: string[] = [
		'BEGIN:VCARD',
		'VERSION:4.0',
		`UID:${contact.uid}`,
		`FN:${escapeVCardText(contact.fullName)}`,
		`N:${escapeVCardText(family)};${escapeVCardText(given)};;;`,
		`EMAIL;TYPE=work:${contact.email}`
	];

	if (contact.phone) {
		lines.push(`TEL;TYPE=cell:${contact.phone}`);
	}

	if (contact.note) {
		lines.push(`NOTE:${escapeVCardText(contact.note)}`);
	}

	const revStr = (contact.rev || new Date()).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
	lines.push(`REV:${revStr}`);

	lines.push('END:VCARD');

	return lines.join('\r\n');
}

/**
 * Parse a vCard string into CardDavContact
 */
export function parseVCard(vcfText: string): CardDavContact | null {
	const unfolded = vcfText.replace(/\r?\n[ \t]/g, '');

	const getProp = (name: string): string | null => {
		const regex = new RegExp(`(?:^|\\r?\\n)${name}(?:;[^:]*)?:(.*)(?:\\r?\\n|$)`, 'i');
		const m = unfolded.match(regex);
		return m ? m[1].trim() : null;
	};

	const uid = getProp('UID');
	const fn = getProp('FN');
	const email = getProp('EMAIL');

	if (!fn || !email) {
		return null;
	}

	const nProp = getProp('N');
	let familyName = '';
	let givenName = '';

	if (nProp) {
		const parts = nProp.split(';');
		familyName = parts[0] ? unescapeVCardText(parts[0]) : '';
		givenName = parts[1] ? unescapeVCardText(parts[1]) : '';
	}

	const note = getProp('NOTE');
	const phone = getProp('TEL');

	return {
		uid: uid || `card-${Math.random().toString(36).substring(2)}`,
		fullName: unescapeVCardText(fn),
		givenName,
		familyName,
		email,
		phone: phone ? unescapeVCardText(phone) : undefined,
		note: note ? unescapeVCardText(note) : undefined
	};
}
