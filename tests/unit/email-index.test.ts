import { describe, it, expect, vi } from 'vitest';
import {
	sendBookingEmail,
	sendCancellationEmail,
	type BookingEmailData
} from '../../src/lib/server/email/index';

describe('Email Module Entry Point (src/lib/server/email/index.ts)', () => {
	const sampleData: BookingEmailData = {
		attendeeName: 'John Doe',
		attendeeEmail: 'john@example.com',
		eventName: '1-on-1 Consultation',
		eventDescription: 'Discussion',
		startTime: new Date('2026-09-01T10:00:00Z'),
		endTime: new Date('2026-09-01T10:30:00Z'),
		meetingUrl: 'https://meet.google.com/abc-def-ghi',
		meetingType: 'google_meet',
		bookingId: 'b-101',
		hostName: 'Jane Host',
		hostEmail: 'jane@example.com',
		appUrl: 'https://cloudmeet.pages.dev',
		timeFormat: '24h',
		timezone: 'UTC'
	};

	it('sendBookingEmail dispatches email with SMTP configuration', async () => {
		const customFetch = vi.fn();
		global.fetch = customFetch;

		const config = {
			from: 'jane@example.com',
			replyTo: 'jane@example.com',
			smtp: {
				host: 'smtp.mailtrap.io',
				port: 587,
				username: 'user',
				password: 'pass',
				from: 'jane@example.com'
			}
		};

		// Outside the Workers runtime the SMTP client must fail loudly instead
		// of reporting a false success (no cloudflare:sockets in Node).
		await expect(sendBookingEmail(sampleData, config as any)).rejects.toThrow(/cloudflare:sockets/);
	});
});
