/**
 * API endpoint to test SMTP connection and send a test email
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCurrentUser } from '$lib/server/auth';
import { sendUnifiedEmail } from '$lib/server/email/transporter';

export const POST: RequestHandler = async (event) => {
	const userId = await getCurrentUser(event);
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		const body = await event.request.json() as {
			host: string;
			port: number;
			username?: string;
			password?: string;
			secure?: boolean;
			from: string;
			recipientEmail: string;
		};

		if (!body.host || !body.port || !body.from || !body.recipientEmail) {
			throw error(400, 'Host, port, from address, and recipient email are required');
		}

		await sendUnifiedEmail(
			{
				from: body.from,
				to: body.recipientEmail,
				subject: 'CloudMeet SMTP Test Email',
				text: 'Congratulations! Your SMTP connector is configured properly and ready for production.',
				html: '<h3>Congratulations!</h3><p>Your CloudMeet SMTP connector is configured properly and ready for production.</p>'
			},
			{
				smtp: {
					host: body.host,
					port: Number(body.port),
					username: body.username,
					password: body.password,
					secure: !!body.secure,
					from: body.from
				}
			}
		);

		return json({ success: true, message: 'Test email sent successfully via SMTP!' });
	} catch (err: any) {
		console.error('SMTP test error:', err);
		if (err?.status) throw err;
		throw error(500, `Failed to send test email: ${err.message || err}`);
	}
};
