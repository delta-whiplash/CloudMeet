import { describe, it, expect } from 'vitest';
import {
	generateVCard,
	parseVCard,
	type CardDavContact
} from '../../src/lib/server/carddav/vcard';

describe('vCard (RFC 6350) Module', () => {
	const sampleContact: CardDavContact = {
		uid: 'contact-abc-123@cloudmeet',
		fullName: 'Jane Doe',
		familyName: 'Doe',
		givenName: 'Jane',
		email: 'jane.doe@example.com',
		phone: '+1234567890',
		note: 'Booked 30-min strategy call on CloudMeet'
	};

	describe('generateVCard', () => {
		it('generates a valid RFC 6350 vCard 4.0 string', () => {
			const vcf = generateVCard(sampleContact);

			expect(vcf).toContain('BEGIN:VCARD');
			expect(vcf).toContain('VERSION:4.0');
			expect(vcf).toContain('UID:contact-abc-123@cloudmeet');
			expect(vcf).toContain('FN:Jane Doe');
			expect(vcf).toContain('N:Doe;Jane;;;');
			expect(vcf).toContain('EMAIL;TYPE=work:jane.doe@example.com');
			expect(vcf).toContain('TEL;TYPE=cell:+1234567890');
			expect(vcf).toContain('NOTE:Booked 30-min strategy call on CloudMeet');
			expect(vcf).toContain('END:VCARD');
		});
	});

	describe('parseVCard', () => {
		it('parses a vCard string into a CardDavContact object', () => {
			const vcfContent = [
				'BEGIN:VCARD',
				'VERSION:4.0',
				'UID:contact-999',
				'FN:John Smith',
				'N:Smith;John;;;',
				'EMAIL:john.smith@domain.com',
				'NOTE:Attendee from CloudMeet',
				'END:VCARD'
			].join('\r\n');

			const contact = parseVCard(vcfContent);

			expect(contact).not.toBeNull();
			expect(contact?.uid).toBe('contact-999');
			expect(contact?.fullName).toBe('John Smith');
			expect(contact?.givenName).toBe('John');
			expect(contact?.familyName).toBe('Smith');
			expect(contact?.email).toBe('john.smith@domain.com');
			expect(contact?.note).toBe('Attendee from CloudMeet');
		});
	});
});
