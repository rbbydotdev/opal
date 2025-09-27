const ALLOWED_REFERRERS = ["https://opaledx.com", "http://localhost:3000"];

function isAllowedRequest(req: Request, url: URL): boolean {
  const q = url.searchParams;
  return (
    req.method === "OPTIONS" ||
    (req.method === "GET" &&
      url.pathname.endsWith("/info/refs") &&
      ["git-upload-pack", "git-receive-pack"].includes(q.get("service") || "")) ||
    (req.method === "POST" &&
      url.pathname.endsWith("git-upload-pack") &&
      req.headers.get("content-type") === "application/x-git-upload-pack-request") ||
    (req.method === "POST" &&
      url.pathname.endsWith("git-receive-pack") &&
      req.headers.get("content-type") === "application/x-git-receive-pack-request")
  );
}

function corsHeaders(req: Request): Record<string, string> {
  const hdr = req.headers;
  return {
    "Access-Control-Allow-Origin": hdr.get("Origin") || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": hdr.get("Access-Control-Request-Headers") || "*",
    Vary: "Origin",
  };
}

function stripHeaders(h: Headers): Headers {
  const out = new Headers(h);
  ["host", "origin", "referer", "content-length"].forEach((k) => out.delete(k));
  return out;
}

function mergeHeaders(h: Headers, x: Record<string, string>): Headers {
  const o = new Headers(h);
  for (const [k, v] of Object.entries(x)) o.set(k, v);
  return o;
}

async function handle(req: Request): Promise<Response> {
  const src = new URL(req.url);

  // Referrer check
  const referer = req.headers.get("referer");
  if (!referer || !ALLOWED_REFERRERS.some((allowed) => referer.startsWith(allowed))) {
    return new Response("Forbidden: Invalid referer", { status: 403 });
  }

  if (!isAllowedRequest(req, src)) {
    return new Response("Forbidden", { status: 403 });
  }

  // Target git server URL: drop leading slash from pathname
  const target = "https://" + src.pathname.slice(1) + src.search;

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders(req),
    });
  }

  const resp = await fetch(target, {
    method: req.method,
    headers: stripHeaders(req.headers),
    body: req.body,
    redirect: "follow",
  });

  return new Response(resp.body, {
    status: resp.status,
    headers: mergeHeaders(resp.headers, corsHeaders(req)),
  });
}

// --- Module syntax entrypoint ---
export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    return handle(request);
  },
};
