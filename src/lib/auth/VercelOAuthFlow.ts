import { ENV } from "@/lib/env";
import { mapToTypedError } from "@/lib/errors";

/**
 * OAuth Types
 */
export type VercelOAuthFlowPayload = {
  accessToken: string;
  obtainedAt: number;
  expiresIn?: number;
  refreshToken?: string;
  tokenType: string;
  scope: string;
};

/**
 * Build Vercel authorize URL
 */
export function getVercelOAuthUrl({
  clientId = ENV.PUBLIC_VERCEL_CLIENT_ID!,
  redirectUri,
  state,
  scopes = ["user:read"],
}: {
  clientId?: string;
  redirectUri: string;
  state?: string;
  scopes?: string[];
}): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes.join(" "),
    ...(state ? { state } : {}),
  });

  return `https://api.vercel.com/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken({
  code,
  redirectUri,
  clientId = ENV.PUBLIC_VERCEL_CLIENT_ID!,
  clientSecret = ENV.VERCEL_CLIENT_SECRET!,
  corsProxy,
}: {
  code: string;
  redirectUri: string;
  clientId?: string;
  clientSecret?: string;
  corsProxy?: string;
}): Promise<VercelOAuthFlowPayload> {
  try {
    const tokenUrl = "https://api.vercel.com/oauth/access_token";
    const url = corsProxy ? `${corsProxy}/${tokenUrl}` : tokenUrl;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
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

export { VercelClient } from "@/lib/vercel/VercelClient";
