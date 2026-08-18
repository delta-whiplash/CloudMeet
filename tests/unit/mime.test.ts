import { describe, it, expect } from 'vitest';
import {
	buildMimeMessage,
	type MimeEmailOptions
} from '../../src/lib/server/email/mime';

describe('RFC 5322 MIME Message Builder', () => {
	it('builds a valid multipart/alternative MIME message with text and HTML', () => {
		const options: MimeEmailOptions = {
			from: { name: 'CloudMeet', email: 'no-reply@example.com' },
			to: 'attendee@domain.com',
			replyTo: 'host@example.com',
			subject: 'Booking Confirmed: Consultation Call',
			text: 'Hello Attendee,\nYour booking is confirmed.',
			html: '<h1>Hello Attendee</h1><p>Your booking is confirmed.</p>'
		};

		const mime = buildMimeMessage(options);

		expect(mime).toContain('From: CloudMeet <no-reply@example.com>');
		expect(mime).toContain('To: attendee@domain.com');
		expect(mime).toContain('Reply-To: host@example.com');
		expect(mime).toContain('Subject: Booking Confirmed: Consultation Call');
		expect(mime).toContain('MIME-Version: 1.0');
		expect(mime).toContain('Content-Type: multipart/alternative; boundary=');
		expect(mime).toContain('Content-Type: text/plain; charset=utf-8');
		expect(mime).toContain('Hello Attendee,\nYour booking is confirmed.');
		expect(mime).toContain('Content-Type: text/html; charset=utf-8');
		expect(mime).toContain('<h1>Hello Attendee</h1><p>Your booking is confirmed.</p>');
	});

	it('includes iCalendar attachment when provided', () => {
		const options: MimeEmailOptions = {
			from: { name: 'Host', email: 'host@example.com' },
			to: 'attendee@example.com',
			subject: 'Meeting Invitation',
			text: 'Please find attached your calendar invite.',
			html: '<p>Please find attached your calendar invite.</p>',
			icsAttachment: {
				filename: 'invite.ics',
				content: 'BEGIN:VCALENDAR\r\nEND:VCALENDAR'
			}
		};

		const mime = buildMimeMessage(options);

		expect(mime).toContain('Content-Type: text/calendar; method=REQUEST; charset=utf-8; name="invite.ics"');
		expect(mime).toContain('Content-Disposition: attachment; filename="invite.ics"');
		expect(mime).toContain('BEGIN:VCALENDAR');
	});
});
