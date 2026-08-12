/**
 * Edge Cache & HTTP ETag utilities using Web Crypto API and Cloudflare's caches.default
 */

export async function generateETag(
	userId: string,
	eventSlug: string,
	date: string,
	lastModified: string
): Promise<string> {
	const data = `${userId}:${eventSlug}:${date}:${lastModified}`;
	const encoder = new TextEncoder();
	const digestBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
	const hashArray = Array.from(new Uint8Array(digestBuffer));
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
	return `"${hashHex}"`;
}

export function shouldReturn304(ifNoneMatch: string | null, currentETag: string): boolean {
	if (!ifNoneMatch) return false;
	const matchHeader = ifNoneMatch.trim();
	if (matchHeader === '*') return true;
	return matchHeader === currentETag || matchHeader === `W/${currentETag}`;
}

export async function getCachedResponse(request: Request): Promise<Response | null> {
	try {
		if (typeof caches !== 'undefined' && caches.default) {
			const cache = caches.default;
			const match = await cache.match(request);
			if (match) return match;
		}
	} catch (err) {
		console.warn('Cache API match error:', err);
	}
	return null;
}

export async function cacheResponse(
	request: Request,
	response: Response,
	ttlSeconds = 60
): Promise<void> {
	try {
		if (typeof caches !== 'undefined' && caches.default) {
			const cache = caches.default;
			const cachedResponse = new Response(response.body, response);
			cachedResponse.headers.set('Cache-Control', `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}`);
			await cache.put(request, cachedResponse);
		}
	} catch (err) {
		console.warn('Cache API put error:', err);
	}
}
