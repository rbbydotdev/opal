/// <reference types="@cloudflare/workers-types" />
const GITHUB_API = "https://api.github.com";

// Add your allowed referrers here
const ALLOWED_REFERRERS = [
  "https://opal-editor.com",
  "http://localhost:3000", // Add your local dev URL if needed
];

addEventListener("fetch", (event) => {
  const fetchEvent = event as FetchEvent;
  fetchEvent.respondWith(handleRequest(fetchEvent.request));
});

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // Only allow requests to /github/*
  if (!url.pathname.startsWith("/github/")) {
    return new Response("Not found", { status: 404 });
  }

  // Check Referer header
  const referer = request.headers.get("referer");
  if (!referer || !ALLOWED_REFERRERS.some((allowed) => referer.startsWith(allowed))) {
    return new Response("Forbidden: Invalid referer", { status: 403 });
  }

  // Remove the /github prefix and forward the rest to GitHub API
  const apiPath = url.pathname.replace("/github", "");
  const apiUrl = GITHUB_API + apiPath + url.search;

  // Handle preflight CORS
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  // Forward the request to GitHub API
  const fetchInit: RequestInit = {
    method: request.method,
    headers: filterHeaders(request.headers),
    body: request.method !== "GET" && request.method !== "HEAD" ? await request.text() : undefined,
    redirect: "follow",
  };

  const response = await fetch(apiUrl, fetchInit);

  // Clone and add CORS headers
  const respHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders())) {
    respHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: respHeaders,
  });
}

// Only allow certain headers to be forwarded
function filterHeaders(headers: Headers): Headers {
  const newHeaders = new Headers();
  headers.forEach((value, key) => {
    if (!["host", "referer", "origin", "x-forwarded-for"].includes(key.toLowerCase())) {
      newHeaders.set(key, value);
    }
  });
  // Optionally, set your own GitHub token here for authenticated requests
  // newHeaders.set('Authorization', 'Bearer YOUR_GITHUB_TOKEN');
  return newHeaders;
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };
}
