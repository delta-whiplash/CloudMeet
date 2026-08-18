/**
 * CardDAV (RFC 6350 / RFC 6352) Client
 * Native WebDAV HTTP fetch calls for Cloudflare Workers.
 */

import { generateVCard, type CardDavContact } from './vcard';

export interface CardDavConfig {
	serverUrl: string;       // e.g. "https://carddav.example.com/remote.php/dav/addressbooks/user/"
	username: string;
	password: string;
	addressBookPath?: string; // e.g. "contacts"
}

export class CardDavClient {
	private config: CardDavConfig;
	private fetchFn: typeof fetch;

	constructor(config: CardDavConfig, customFetch?: typeof fetch) {
		this.config = config;
		this.fetchFn = customFetch || fetch;
	}

	private getFullAddressBookUrl(): string {
		let baseUrl = this.config.serverUrl.trim();
		if (!baseUrl.endsWith('/')) {
			baseUrl += '/';
		}
		if (this.config.addressBookPath) {
			const path = this.config.addressBookPath.replace(/^\//, '');
			return baseUrl + path;
		}
		return baseUrl;
	}

	private getAuthHeader(): string {
		const authStr = `${this.config.username}:${this.config.password}`;
		const encoded = typeof btoa === 'function'
			? btoa(authStr)
			: Buffer.from(authStr).toString('base64');
		return `Basic ${encoded}`;
	}

	/**
	 * Perform PROPFIND to check connection to CardDAV server
	 */
	async testConnection(): Promise<boolean> {
		const url = this.getFullAddressBookUrl();
		try {
			const response = await this.fetchFn(url, {
				method: 'PROPFIND',
				headers: {
					Authorization: this.getAuthHeader(),
					Depth: '0',
					'Content-Type': 'application/xml; charset=utf-8'
				},
				body: [
					'<?xml version="1.0" encoding="utf-8" ?>',
					'<d:propfind xmlns:d="DAV:">',
					'  <d:prop>',
					'    <d:displayname/>',
					'    <d:resourcetype/>',
					'  </d:prop>',
					'</d:propfind>'
				].join('\n')
			});
			return response.ok || response.status === 207;
		} catch (err) {
			console.error('CardDAV testConnection error:', err);
			return false;
		}
	}

	/**
	 * Create or update contact on CardDAV addressbook via PUT
	 */
	async createContact(contact: CardDavContact): Promise<void> {
		const bookUrl = this.getFullAddressBookUrl().replace(/\/$/, '');
		const contactUrl = `${bookUrl}/${encodeURIComponent(contact.uid)}.vcf`;
		const vcfBody = generateVCard(contact);

		const response = await this.fetchFn(contactUrl, {
			method: 'PUT',
			headers: {
				Authorization: this.getAuthHeader(),
				'Content-Type': 'text/vcard; charset=utf-8'
			},
			body: vcfBody
		});

		if (!response.ok && response.status !== 201 && response.status !== 204) {
			const errText = await response.text();
			throw new Error(`CardDAV PUT failed (${response.status}): ${errText}`);
		}
	}
}
