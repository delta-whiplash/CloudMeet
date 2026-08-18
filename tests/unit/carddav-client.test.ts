import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	CardDavClient,
	type CardDavConfig
} from '../../src/lib/server/carddav/carddav-client';
import type { CardDavContact } from '../../src/lib/server/carddav/vcard';

describe('CardDAV WebDAV Client Module', () => {
	const config: CardDavConfig = {
		serverUrl: 'https://carddav.example.com/remote.php/dav/addressbooks/user/',
		username: 'user@example.com',
		password: 'secretpassword',
		addressBookPath: 'contacts'
	};

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('CardDavClient Methods', () => {
		it('testConnection performs a WebDAV PROPFIND request', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 207
			});

			const client = new CardDavClient(config, mockFetch as any);
			const connected = await client.testConnection();

			expect(connected).toBe(true);
			expect(mockFetch).toHaveBeenCalledWith(
				'https://carddav.example.com/remote.php/dav/addressbooks/user/contacts',
				expect.objectContaining({
					method: 'PROPFIND'
				})
			);
		});

		it('createContact sends a PUT request with generated vCard body', async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				status: 201
			});

			const contact: CardDavContact = {
				uid: 'card-101',
				fullName: 'Alice Smith',
				email: 'alice.smith@example.com'
			};

			const client = new CardDavClient(config, mockFetch as any);
			await client.createContact(contact);

			expect(mockFetch).toHaveBeenCalledWith(
				'https://carddav.example.com/remote.php/dav/addressbooks/user/contacts/card-101.vcf',
				expect.objectContaining({
					method: 'PUT',
					headers: expect.objectContaining({
						'Content-Type': 'text/vcard; charset=utf-8'
					}),
					body: expect.stringContaining('BEGIN:VCARD')
				})
			);
		});
	});
});
