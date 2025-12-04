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
};
export async function GithubDeviceAuthFlow({
  corsProxy,
  scopes = ["read:user", "repo", "workflow"],
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
    } satisfies GithubDeviceAuthFlowPayload;
    onAuthentication?.(payload);
    return payload;
  } catch (e) {
    console.error("Failed to fetch user info:", e);
    throw mapToTypedError(e);
  }
}

// const token = auth.token;

// const response = await fetch("https://api.github.com/user", {
//   headers: {
//     Authorization: `Bearer ${token}`,
//     Accept: "application/vnd.github+json",
//   },
// });

// if (!response.ok) {
//   throw new Error("Failed to fetch user info");
// }

// const user = await response.json();
// console.log(user.login); // This is the username
