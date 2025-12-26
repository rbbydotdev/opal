// Unified API Proxy for GitHub, Netlify, Vercel, Cloudflare, and AWS S3 APIs
// Using Hono for clean routing and built-in CORS support

import { Hono } from "hono";
import { cors } from "hono/cors";
import { getAllowedHeaders, getExposedHeaders } from "./specialHeaders";

const ALLOWED_ORIGINS = ["https://opaledx.com", "http://localhost:3000"];

// Service configuration
const SERVICES = {
  github: {
    hosts: ["github.com", "api.github.com"],
    oauthEndpoint: "/login/oauth/access_token",
    clientSecretEnv: "GITHUB_CLIENT_SECRET" as keyof Env,
    oauthEnabled: true,
  },
  netlify: {
    hosts: ["api.netlify.com"],
    oauthEndpoint: "/oauth/token",
    clientSecretEnv: "NETLIFY_CLIENT_SECRET" as keyof Env,
    oauthEnabled: true,
  },
  vercel: {
    hosts: ["api.vercel.com"],
    oauthEndpoint: "/login/oauth/token",
    clientSecretEnv: "VERCEL_CLIENT_SECRET" as keyof Env,
    oauthEnabled: true,
  },
  cloudflare: {
    hosts: ["api.cloudflare.com"],
    oauthEndpoint: "/client/v4/oauth2/token",
    clientSecretEnv: "CLOUDFLARE_CLIENT_SECRET" as keyof Env,
    oauthEnabled: false, // API only, no OAuth support yet
  },
  aws: {
    hosts: ["*.amazonaws.com", "s3.amazonaws.com", "*.s3.amazonaws.com"],
    oauthEndpoint: null, // Not applicable for AWS API authentication
    clientSecretEnv: null, // Not applicable for AWS API authentication
    oauthEnabled: false, // API only, uses access keys
  },
} as const;

type ServiceName = keyof typeof SERVICES;

interface Env {
  GITHUB_CLIENT_SECRET?: string;
  NETLIFY_CLIENT_SECRET?: string;
  VERCEL_CLIENT_SECRET?: string;
  CLOUDFLARE_CLIENT_SECRET?: string;
}

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

// Removed createCorsConfig - using simpler global approach

// OAuth token exchange handler
async function handleOAuthTokenExchange(
  request: Request,
  serviceName: ServiceName,
  _host: string,
  path: string,
  targetUrl: string,
  env: Env
): Promise<Response | null> {
  const service = SERVICES[serviceName];

  // Check if OAuth is enabled for this service and if this is an OAuth token exchange endpoint
  if (
    !service.oauthEnabled ||
    !service.clientSecretEnv ||
    path !== service.oauthEndpoint ||
    request.method !== "POST"
  ) {
    return null;
  }

  const clientSecret = env[service.clientSecretEnv];
  if (!clientSecret) {
    return new Response(`Server configuration error: ${serviceName} client secret not configured`, {
      status: 500,
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
    });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

// Proxy handler
async function handleProxy(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  // Log all headers
  const headerObj: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headerObj[key] = value;
  });

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Validate origin/referer
  const allowedOrigin = ALLOWED_ORIGINS.find(
    (allowed) => (origin && origin.startsWith(allowed)) || (referer && referer.startsWith(allowed))
  );

  if (!allowedOrigin) {
    return new Response("Forbidden: Invalid origin/referer", { status: 403 });
  }

  // Path: /<host>/<path> (path can be empty for root requests)
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 1) {
    return new Response("Bad request: missing host", { status: 400 });
  }

  const host = segments[0]!;
  const path = segments.length > 1 ? "/" + segments.slice(1).join("/") : "/";

  if (!isHostAllowed(host)) {
    return new Response("Forbidden: Host not allowed", { status: 403 });
  }

  const targetUrl = `https://${host}${path}${url.search}`;
  const serviceName = getServiceForHost(host);

  // Handle service-specific OAuth token exchange
  if (serviceName) {
    const oauthResponse = await handleOAuthTokenExchange(request, serviceName, host, path, targetUrl, env);
    if (oauthResponse) {
      return oauthResponse;
    }
  }

  // Standard proxy request
  const filteredHeaders = filterHeaders(request.headers);

  // For AWS requests, ensure the Host header is correctly set for signature validation
  if (serviceName === "aws") {
    filteredHeaders.set("Host", host);
  }

  const outgoingHeaderObj: Record<string, string> = {};
  filteredHeaders.forEach((value, key) => {
    outgoingHeaderObj[key] = value;
  });

  const fetchInit = {
    method: request.method,
    headers: filteredHeaders,
    // Preserve raw body for AWS signature validation - don't convert to text
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : null,
    redirect: "follow" as RequestRedirect,
  };

  let response: Response;
  try {
    response = await fetch(targetUrl, fetchInit);

    const responseHeaderObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaderObj[key] = value;
    });

    // Log response body for debugging (but be careful with large responses)
    const responseText = await response.text();
    if (responseText.length < 2000) {
    } else {
    }

    // Create new response with the logged body
    return new Response(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (err) {
    console.error("Fetch error:", err);
    return new Response("Upstream fetch failed", { status: 502 });
  }
}

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Apply CORS middleware
app.use("*", cors({
  credentials: true,
  origin: ALLOWED_ORIGINS,
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  allowHeaders: getAllowedHeaders(),
  exposeHeaders: ["etag", ...getExposedHeaders().filter((h) => h !== "etag")],
  maxAge: 86400,
}));

// Handle all proxy requests: /:host/*
app.all("/:host/*", async (c) => {
  return handleProxy(c.req.raw, c.env);
});

export default app;
