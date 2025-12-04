import { ENV } from "@/lib/env";
import { mapToTypedError } from "@/lib/errors/errors";
import { stripTrailingSlash } from "./oauth-utils";

/**
 * OAuth Types
 */
type VercelOAuthFlowPayload = {
  accessToken: string;
  obtainedAt: number;
  expiresIn?: number;
  refreshToken?: string;
  tokenType: string;
  scope: string;
};

/**
 * Build Vercel authorize URL with PKCE
 */
export function getVercelOAuthUrl({
  clientId = ENV.PUBLIC_VERCEL_CLIENT_ID!,
  redirectUri,
  state,
  nonce,
  codeChallenge,
  scopes = ["openid", "email", "profile"],
}: {
  clientId?: string;
  redirectUri: string;
  state?: string;
  nonce: string;
  codeChallenge: string;
  scopes?: string[];
}): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes.join(" "),
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    nonce: nonce,
    ...(state ? { state } : {}),
  });

  return `https://vercel.com/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken({
  code,
  redirectUri,
  codeVerifier,
  clientId = ENV.PUBLIC_VERCEL_CLIENT_ID!,
  corsProxy,
}: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  clientId?: string;
  corsProxy?: string;
}): Promise<VercelOAuthFlowPayload> {
  try {
    const baseUrl = corsProxy ? `${corsProxy}/api.vercel.com` : "https://api.vercel.com";
    const tokenUrl = `${baseUrl}/login/oauth/token`;

    const response = await fetch(tokenUrl, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: clientId,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as any; //fixme: define type

    if (data.error) {
      throw new Error(`OAuth error: ${data.error} - ${data.error_description || ""}`);
    }
    return {
      accessToken: data.access_token,
      tokenType: data.token_type || "bearer",
      scope: data.scope || "",
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token,
      obtainedAt: Date.now(),
    };
  } catch (e) {
    throw mapToTypedError(e);
  }
}

/**
 * Refresh Vercel access token using refresh token
 */
export async function refreshVercelToken({
  refreshToken,
  clientId = ENV.PUBLIC_VERCEL_CLIENT_ID!,
  corsProxy,
}: {
  refreshToken: string;
  clientId?: string;
  corsProxy?: string | null;
}): Promise<VercelOAuthFlowPayload> {
  try {
    const baseUrl = corsProxy ? `${stripTrailingSlash(corsProxy)}/api.vercel.com` : "https://api.vercel.com";
    const tokenUrl = `${baseUrl}/login/oauth/token`;

    const response = await fetch(tokenUrl, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as any;

    if (data.error) {
      throw new Error(`OAuth refresh error: ${data.error} - ${data.error_description || ""}`);
    }

    return {
      accessToken: data.access_token,
      tokenType: data.token_type || "bearer",
      scope: data.scope || "",
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token || refreshToken, // Use new refresh token if provided, else keep current
      obtainedAt: Date.now(),
    };
  } catch (e) {
    throw mapToTypedError(e);
  }
}

/**
 * Validate Vercel access token
 */
export async function validateVercelToken({ accessToken }: { accessToken: string }): Promise<VercelOAuthFlowPayload> {
  try {
    // Validate the token by making a simple API call to Vercel
    const response = await fetch("https://api.vercel.com/v2/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to validate token: ${response.statusText}`);
    }

    const userData = (await response.json()) as { user: { id: string } };

    if (!userData || !userData.user || !userData.user.id) {
      throw new Error("Invalid token: Could not retrieve user data");
    }

    return {
      accessToken,
      tokenType: "bearer",
      scope: "",
      obtainedAt: Date.now(),
    };
  } catch (e) {
    throw mapToTypedError(e);
  }
}
