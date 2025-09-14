import { Env } from "@/lib/env"; // still using your env
import { mapToTypedError } from "@/lib/errors";
import { Octokit } from "@octokit/core";

/**
 * Utils
 */
const stripTrailingSlash = (path: string): string => (path.endsWith("/") ? path.slice(0, -1) : path);

/**
 * PKCE Helpers
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(64); // 64 bytes → ~86 chars when base64url
  crypto.getRandomValues(array);

  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, ""); // no need to trim to 43, leave natural length
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * OAuth Types
 */
export type GithubOAuthFlowPayload = {
  login: string;
  token: string;
  obtainedAt: number;
};

/**
 * Build GitHub authorize URL
 */
export function getGithubOAuthUrl({
  clientId = Env.PublicGithubClientID,
  redirectUri,
  scopes = ["read:user", "repo"], // slim default scope recommendations
  state,
  codeChallenge,
}: {
  clientId?: string;
  redirectUri: string;
  scopes?: string[];
  state?: string;
  codeChallenge: string;
}): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(" "),
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    ...(state ? { state } : {}),
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken({
  code,
  codeVerifier,
  redirectUri,
  corsProxy, // must provide if frontend-only
  clientId = Env.PublicGithubClientID,
}: {
  code: string;
  codeVerifier: string;
  redirectUri?: string;
  corsProxy?: string;
  clientId?: string;
}): Promise<GithubOAuthFlowPayload> {
  console.log("=== Starting OAuth token exchange ===");

  try {
    const baseUrl = corsProxy ? `${stripTrailingSlash(corsProxy)}/github.com` : "https://github.com";
    const tokenUrl = `${baseUrl}/login/oauth/access_token`;

    const params = new URLSearchParams();
    params.append("client_id", "Ov23lipqkfiZDSS9HrCI");
    params.append("code", code);
    params.append("code_verifier", codeVerifier);
    params.append("client_secret", "acf3a6c6242a21d28ed66d957b1fa7adaff948e6"); // 👈 dummy secret for PKCE workaround
    if (redirectUri) params.append("redirect_uri", redirectUri);

    console.log("Token exchange URL:", tokenUrl);
    console.log("Token request params:", Object.fromEntries(params));

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: params,
    });

    console.log("Fetch completed. Response status:", tokenResponse.status, tokenResponse.statusText);

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      token_type?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };
    console.log("Token response data:", tokenData);

    if (tokenData.error) {
      throw new Error(`OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    const token = tokenData.access_token;
    if (!token) {
      throw new Error("No access token received in response");
    }

    console.log("Token received, fetching user info...");

    const apiBaseUrl = corsProxy ? `${stripTrailingSlash(corsProxy)}/api.github.com` : undefined;

    const octokit = new Octokit({
      auth: token,
      baseUrl: apiBaseUrl,
    });

    const { data: user } = await octokit.request("GET /user");
    console.log("User data received:", { login: user.login, id: user.id });

    return {
      login: user.login,
      token,
      obtainedAt: Date.now(),
    };
  } catch (e) {
    console.error("=== OAuth token exchange failed ===", e);
    throw mapToTypedError(e);
  }
}
