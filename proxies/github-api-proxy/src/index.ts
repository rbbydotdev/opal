const ALLOWED_ORIGINS = ['https://opaledx.com', 'http://localhost:3000'];
const ALLOWED_HOSTS = ['github.com', 'api.github.com', '*.github.com'];
// DONT FORGET TO SET GITHUB_CLIENT_SECRET in your Cloudflare Workers environment variables!

function filterHeaders(headers: Headers): Headers {
	const newHeaders = new Headers();
	headers.forEach((value, key) => {
		if (!['host', 'referer', 'origin', 'x-forwarded-for'].includes(key.toLowerCase())) {
			newHeaders.set(key, value);
		}
	});
	if (!newHeaders.has('User-Agent')) {
		newHeaders.set('User-Agent', 'OpalEditorProxy/1.0');
	}
	return newHeaders;
}

function isHostAllowed(host: string): boolean {
	for (const pattern of ALLOWED_HOSTS) {
		if (pattern.startsWith('*.')) {
			const domain = pattern.slice(2);
			if (host === domain || host.endsWith('.' + domain)) {
				return true;
			}
		} else {
			if (host === pattern) {
				return true;
			}
		}
	}
	return false;
}

function corsHeaders(origin: string | null): Record<string, string> {
	return {
		'Access-Control-Allow-Origin': origin ?? '*',
		'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': [
			'Content-Type',
			'Authorization',
			'X-Requested-With',
			'Accept',
			'Accept-Encoding',
			'Accept-Language',
			'User-Agent',
		].join(', '),
		'Access-Control-Max-Age': '86400',
	};
}

interface Env {
	GITHUB_CLIENT_SECRET?: string;
}

const handleRequest = async (request: Request, env: Env): Promise<Response> => {
	const url = new URL(request.url);
	const origin = request.headers.get('origin');
	const referer = request.headers.get('referer');
	const allowedOrigin =
		ALLOWED_ORIGINS.find((allowed) => (origin && origin.startsWith(allowed)) || (referer && referer.startsWith(allowed))) ?? null;

	if (!allowedOrigin) {
		return new Response('Forbidden: Invalid origin/referer', {
			status: 403,
			headers: corsHeaders(origin),
		});
	}

	// Path: /<host>/<path>
	const segments = url.pathname.split('/').filter(Boolean);
	if (segments.length < 2) {
		return new Response('Bad request: missing host or path', {
			status: 400,
			headers: corsHeaders(origin),
		});
	}

	const host = segments[0];
	const path = '/' + segments.slice(1).join('/');

	if (!isHostAllowed(host)) {
		return new Response('Forbidden: Host not allowed', {
			status: 403,
			headers: corsHeaders(origin),
		});
	}

	const targetUrl = `https://${host}${path}${url.search}`;

	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: corsHeaders(origin),
		});
	}

	// Handle GitHub OAuth token exchange - inject client secret
	if (host === 'github.com' && path === '/login/oauth/access_token' && request.method === 'POST') {
		if (!env.GITHUB_CLIENT_SECRET) {
			return new Response('Server configuration error: GitHub client secret not configured', {
				status: 500,
				headers: corsHeaders(origin),
			});
		}

		const body = await request.text();
		const contentType = request.headers.get('content-type') || '';

		let params: URLSearchParams;
		if (contentType.includes('application/json')) {
			// Handle JSON request from @octokit/auth-oauth-device
			const jsonData = JSON.parse(body);
			params = new URLSearchParams();
			for (const [key, value] of Object.entries(jsonData)) {
				params.set(key, String(value));
			}
		} else {
			// Handle URL-encoded request
			params = new URLSearchParams(body);
		}

		// Add the client secret to the request
		params.set('client_secret', env.GITHUB_CLIENT_SECRET);

		const fetchInit = {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/x-www-form-urlencoded',
				'User-Agent': 'OpalEditorProxy/1.0',
			},
			body: params.toString(),
		};

		let response: Response;
		try {
			response = await fetch(targetUrl, fetchInit);
		} catch (err) {
			return new Response('GitHub OAuth request failed', {
				status: 502,
				headers: corsHeaders(origin),
			});
		}

		const responseBody = await response.arrayBuffer();
		const respHeaders = new Headers(response.headers);
		for (const [key, value] of Object.entries(corsHeaders(origin))) {
			respHeaders.set(key, value);
		}

		return new Response(responseBody, {
			status: response.status,
			statusText: response.statusText,
			headers: respHeaders,
		});
	}

	const fetchInit = {
		method: request.method,
		headers: filterHeaders(request.headers),
		body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
		redirect: 'follow',
	};

	let response: Response;
	try {
		response = await fetch(targetUrl, fetchInit);
	} catch (err) {
		return new Response('Upstream fetch failed', {
			status: 502,
			headers: corsHeaders(origin),
		});
	}

	const responseBody = await response.arrayBuffer();
	const respHeaders = new Headers(response.headers);
	for (const [key, value] of Object.entries(corsHeaders(origin))) {
		respHeaders.set(key, value);
	}

	return new Response(responseBody, {
		status: response.status,
		statusText: response.statusText,
		headers: respHeaders,
	});
};

export default {
	fetch: handleRequest,
};
