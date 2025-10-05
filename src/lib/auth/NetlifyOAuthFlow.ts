import { ENV } from "@/lib/env";
import { mapToTypedError } from "@/lib/errors";

/**
 * OAuth Types
 */
export type NetlifyOAuthFlowPayload = {
  accessToken: string;
  obtainedAt: number;
};

/**
 * Build Netlify authorize URL
 */
export function getNetlifyOAuthUrl({
  clientId = ENV.PUBLIC_NETLIFY_CLIENT_ID,
  redirectUri,
  state,
}: {
  clientId?: string;
  redirectUri: string;
  state?: string;
}): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "token",
    redirect_uri: redirectUri,
    ...(state ? { state } : {}),
  });

  return `https://app.netlify.com/authorize?${params.toString()}`;
}

export async function validateNetlifyToken({ accessToken }: { accessToken: string }): Promise<NetlifyOAuthFlowPayload> {
  try {
    // Validate the token by making a simple API call to Netlify
    const response = await fetch("https://api.netlify.com/api/v1/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to validate token: ${response.statusText}`);
    }

    const userData = await response.json();

    if (!userData || !userData.id) {
      throw new Error("Invalid token: Could not retrieve user data");
    }

    return {
      accessToken,
      obtainedAt: Date.now(),
    };
  } catch (e) {
    throw mapToTypedError(e);
  }
}

export { NetlifyClient } from "@/lib/netlify/NetlifyClient";
