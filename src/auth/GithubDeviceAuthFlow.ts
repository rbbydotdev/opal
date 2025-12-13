import { ENV } from "@/lib/env";
import { mapToTypedError } from "@/lib/errors/errors";
import { optionalCORSBaseURL } from "@/lib/optionalCORSBaseURL";
import { stripTrailingSlash } from "@/lib/paths2";
import { createOAuthDeviceAuth } from "@octokit/auth-oauth-device";
import { Octokit } from "@octokit/core";
import { request } from "@octokit/request";
import { OnVerificationCallback } from "node_modules/@octokit/auth-oauth-device/dist-types/types";
type GithubDeviceAuthFlowPayload = {
  login: string;
  token: string;
  obtainedAt: number;
  scope: string;
};
export async function GithubDeviceAuthFlow({
  corsProxy,
  scopes = ["read:user", "public_repo", "workflow"],
  onVerification,
  onAuthentication,
}: {
  corsProxy?: string;
  scopes?: string[];
  onVerification: OnVerificationCallback;
  onVerificationError?: (error: Error) => void;
  onAuthentication?: (auth: GithubDeviceAuthFlowPayload) => void;
}) {
  const proxiedRequest = corsProxy
    ? request.defaults({
        baseUrl: `${stripTrailingSlash(corsProxy)}/github.com`,
      })
    : undefined;
  const auth = createOAuthDeviceAuth({
    request: proxiedRequest,
    clientType: "oauth-app",
    clientId: ENV.PUBLIC_GITHUB_CLIENT_ID,
    scopes,
    onVerification,
  });

  const authResult = await auth({ type: "oauth" });

  try {
    const baseUrl = optionalCORSBaseURL(corsProxy, "api.github.com");
    const octokit = new Octokit({
      auth: authResult.token,
      baseUrl,
    });
    const { data: user } = await octokit.request("GET /user");
    const payload = {
      login: user.login,
      token: authResult.token,
      obtainedAt: Date.now(),
      scope: scopes.join(","),
    } satisfies GithubDeviceAuthFlowPayload;
    onAuthentication?.(payload);
    return payload;
  } catch (e) {
    console.error("Failed to fetch user info:", e);
    throw mapToTypedError(e);
  }
}
