/**
 * Interactive Swagger UI Documentation Endpoint
 * Protected by admin session authentication - Redirects to /auth/login if unauthenticated.
 */

import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCurrentUser } from '$lib/server/auth';

export const GET: RequestHandler = async (event) => {
	const userId = await getCurrentUser(event);
	if (!userId) {
		throw redirect(302, '/auth/login');
	}

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>CloudMeet API Documentation (Swagger UI)</title>
	<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css" />
	<style>
		html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
		*, *:before, *:after { box-sizing: inherit; }
		body { margin: 0; background: #fafafa; font-family: sans-serif; }
		.swagger-ui .topbar { background-color: #1e293b; padding: 10px 0; }
		.swagger-ui .topbar a { max-width: 800px; font-size: 1.2em; font-weight: bold; color: #fff; text-decoration: none; }
	</style>
</head>
<body>
	<div id="swagger-ui"></div>
	<script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js" charset="UTF-8"></script>
	<script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
	<script>
		window.onload = function() {
			window.ui = SwaggerUIBundle({
				url: "/api/openapi.json",
				dom_id: '#swagger-ui',
				deepLinking: true,
				presets: [
					SwaggerUIBundle.presets.apis,
					SwaggerUIStandalonePreset
				],
				plugins: [
					SwaggerUIBundle.plugins.DownloadUrl
				],
				layout: "StandaloneLayout"
			});
		};
	</script>
</body>
</html>`;

	return new Response(html, {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': 'no-store, private'
		}
	});
};
