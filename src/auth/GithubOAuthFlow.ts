import { ENV } from "@/lib/env"; // still using your env
import { mapToTypedError } from "@/lib/errors/errors";
import { Octokit } from "@octokit/core";
import { stripTrailingSlash } from "./oauth-utils";

/**
 * OAuth Types
 */
type GithubOAuthFlowPayload = {
  login: string;
  token: string;
  obtainedAt: number;
};

/**
 * Build GitHub authorize URL
 */
export function getGithubOAuthUrl({
  redirectUri,
  scopes = ["read:user", "repo", "workflow"], // slim default scope recommendations
  state,
  codeChallenge,
}: {
  redirectUri: string;
  scopes?: string[];
  state?: string;
  codeChallenge: string;
}): string {
  const params = new URLSearchParams({
    client_id: ENV.PUBLIC_GITHUB_CLIENT_ID,
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
}: {
  code: string;
  codeVerifier: string;
  redirectUri?: string;
  corsProxy?: string;
}): Promise<GithubOAuthFlowPayload> {
  try {
    const baseUrl = corsProxy ? `${stripTrailingSlash(corsProxy)}/github.com` : "https://github.com";
    const tokenUrl = `${baseUrl}/login/oauth/access_token`;

    const params = new URLSearchParams();
    params.append("client_id", ENV.PUBLIC_GITHUB_CLIENT_ID);
    params.append("code", code);
    params.append("code_verifier", codeVerifier);
    if (redirectUri) params.append("redirect_uri", redirectUri);

    // logger.log("Token exchange URL:", tokenUrl);
    // logger.log("Token request params:", Object.fromEntries(params));

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: params,
    });

    // logger.log("Fetch completed. Response status:", tokenResponse.status, tokenResponse.statusText);

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      token_type?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };

    if (tokenData.error) {
      throw new Error(`OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    const token = tokenData.access_token;
    if (!token) {
      throw new Error("No access token received in response");
    }

    const apiBaseUrl = corsProxy ? `${stripTrailingSlash(corsProxy)}/api.github.com` : undefined;

    const octokit = new Octokit({
      auth: token,
      baseUrl: apiBaseUrl,
    });

    const { data: user } = await octokit.request("GET /user");
    // logger.log("User data received:", { login: user.login, id: user.id });

    return {
      login: user.login,
      token,
      obtainedAt: Date.now(),
    };
  } catch (e) {
    // logger.error("=== OAuth token exchange failed ===", e);
    throw mapToTypedError(e);
  }
}
