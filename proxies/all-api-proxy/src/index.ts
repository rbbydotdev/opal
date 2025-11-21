// Unified API Proxy for GitHub, Netlify, Vercel, and Cloudflare APIs
// Combines all service-specific proxies into one intelligent proxy

const ALLOWED_ORIGINS = ["https://opaledx.com", "http://localhost:3000"];

// Service configuration
const SERVICES = {
  github: {
    hosts: ["github.com", "api.github.com", "*.github.com"],
    oauthEndpoint: "/login/oauth/access_token",
    clientSecretEnv: "GITHUB_CLIENT_SECRET",
  },
  netlify: {
    hosts: ["api.netlify.com"],
    oauthEndpoint: "/oauth/token",
    clientSecretEnv: "NETLIFY_CLIENT_SECRET",
  },
  vercel: {
    hosts: ["api.vercel.com"],
    oauthEndpoint: "/oauth/access_token",
    clientSecretEnv: "VERCEL_CLIENT_SECRET",
  },
  cloudflare: {
    hosts: ["api.cloudflare.com"],
    oauthEndpoint: "/client/v4/oauth2/token", // Cloudflare OAuth endpoint (if/when supported)
    clientSecretEnv: "CLOUDFLARE_CLIENT_SECRET",
  },
} as const;

type ServiceName = keyof typeof SERVICES;

function filterHeaders(headers: Headers): Headers {
  const newHeaders = new Headers();
  headers.forEach((value, key) => {
    if (!["host", "referer", "origin", "x-forwarded-for"].includes(key.toLowerCase())) {
      newHeaders.set(key, value);
    }
  });
  if (!newHeaders.has("User-Agent")) {
    newHeaders.set("User-Agent", "OpalEditorProxy/1.0");
  }
  return newHeaders;
}

function isHostAllowed(host: string): boolean {
  for (const service of Object.values(SERVICES)) {
    for (const pattern of service.hosts) {
      if (pattern.startsWith("*.")) {
        const domain = pattern.slice(2);
        if (host === domain || host.endsWith("." + domain)) {
          return true;
        }
      } else {
        if (host === pattern) {
          return true;
        }
      }
    }
  }
  return false;
}

function getServiceForHost(host: string): ServiceName | null {
  for (const [serviceName, config] of Object.entries(SERVICES)) {
    for (const pattern of config.hosts) {
      if (pattern.startsWith("*.")) {
        const domain = pattern.slice(2);
        if (host === domain || host.endsWith("." + domain)) {
          return serviceName as ServiceName;
        }
      } else {
        if (host === pattern) {
          return serviceName as ServiceName;
        }
      }
    }
  }
  return null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Accept-Encoding",
      "Accept-Language",
      "User-Agent",
    ].join(", "),
    "Access-Control-Max-Age": "86400",
  };
}

interface Env {
  GITHUB_CLIENT_SECRET?: string;
  NETLIFY_CLIENT_SECRET?: string;
  VERCEL_CLIENT_SECRET?: string;
  CLOUDFLARE_CLIENT_SECRET?: string;
}

async function handleOAuthTokenExchange(
  request: Request,
  serviceName: ServiceName,
  host: string,
  path: string,
  targetUrl: string,
  env: Env,
  origin: string | null
): Promise<Response | null> {
  const service = SERVICES[serviceName];
  
  // Check if this is an OAuth token exchange endpoint
  if (path !== service.oauthEndpoint || request.method !== "POST") {
    return null;
  }

  const clientSecret = env[service.clientSecretEnv];
  if (!clientSecret) {
    return new Response(`Server configuration error: ${serviceName} client secret not configured`, {
      status: 500,
      headers: corsHeaders(origin),
    });
  }

  const body = await request.text();
  const contentType = request.headers.get("content-type") || "";

  let params: URLSearchParams;
  if (contentType.includes("application/json")) {
    // Handle JSON request (used by some OAuth libraries)
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
  params.set("client_secret", clientSecret);

  const fetchInit = {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "OpalEditorProxy/1.0",
    },
    body: params.toString(),
  };

  let response: Response;
  try {
    response = await fetch(targetUrl, fetchInit);
  } catch (err) {
    return new Response(`${serviceName} OAuth request failed`, {
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

const handleRequest = async (request: Request, env: Env): Promise<Response> => {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const allowedOrigin =
    ALLOWED_ORIGINS.find(
      (allowed) => (origin && origin.startsWith(allowed)) || (referer && referer.startsWith(allowed))
    ) ?? null;

  if (!allowedOrigin) {
    return new Response("Forbidden: Invalid origin/referer", {
      status: 403,
      headers: corsHeaders(origin),
    });
  }

  // Path: /<host>/<path>
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    return new Response("Bad request: missing host or path", {
      status: 400,
      headers: corsHeaders(origin),
    });
  }

  const host = segments[0];
  const path = "/" + segments.slice(1).join("/");

  if (!isHostAllowed(host)) {
    return new Response("Forbidden: Host not allowed", {
      status: 403,
      headers: corsHeaders(origin),
    });
  }

  const targetUrl = `https://${host}${path}${url.search}`;
  const serviceName = getServiceForHost(host);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  // Handle service-specific OAuth token exchange
  if (serviceName) {
    const oauthResponse = await handleOAuthTokenExchange(
      request,
      serviceName,
      host,
      path,
      targetUrl,
      env,
      origin
    );
    if (oauthResponse) {
      return oauthResponse;
    }
  }

  // Standard proxy request
  const fetchInit = {
    method: request.method,
    headers: filterHeaders(request.headers),
    body: request.method !== "GET" && request.method !== "HEAD" ? await request.text() : undefined,
    redirect: "follow",
  };

  let response: Response;
  try {
    response = await fetch(targetUrl, fetchInit);
  } catch (err) {
    return new Response("Upstream fetch failed", {
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