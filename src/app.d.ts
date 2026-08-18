/// <reference types="@sveltejs/kit" />
/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Platform {
			env: {
				DB: D1Database;
				KV: KVNamespace;
				GOOGLE_CLIENT_ID: string;
				GOOGLE_CLIENT_SECRET: string;
				JWT_SECRET: string;
				BASE_URL: string;
				MICROSOFT_CLIENT_ID?: string;
				MICROSOFT_CLIENT_SECRET?: string;
				APP_URL?: string;
				ADMIN_EMAIL?: string;
				EMAILIT_API_KEY?: string;
				EMAIL_FROM?: string;
				TURNSTILE_SECRET_KEY?: string;
				CRON_SECRET?: string;
				DASHBOARD_DEMO?: string;
				SMTP_HOST?: string;
				SMTP_PORT?: string;
				SMTP_USER?: string;
				SMTP_PASS?: string;
				SMTP_SECURE?: string;
				SMTP_FROM?: string;
			};
			context: {
				waitUntil(promise: Promise<any>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
		interface Locals {
			requestId?: string;
			user?: {
				id: string;
				email: string;
				name: string;
			};
		}
	}
}

export {};