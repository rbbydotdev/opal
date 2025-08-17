import { Env } from "@/lib/env";
import { mapToTypedError } from "@/lib/errors";
import { createOAuthDeviceAuth } from "@octokit/auth-oauth-device";
import { Octokit } from "@octokit/core";
import { request } from "@octokit/request";
import { OnVerificationCallback } from "../../../node_modules/@octokit/auth-oauth-device/dist-types/types";
// GithubVarer{
//    device_code: "3584d83530557fdd1f46af8289938c8ef79f9dc5",
//    user_code: "WDJB-MJHT",
//    verification_uri: "https://github.com/login/device",
//    expires_in: 900,
//    interval: 5,
//  };

// corsProxy,
// clientId: NotEnv.PublicGithubClientID,
// scopes: ["public_repo", "private_repo", "repo", "workflow"],
const stripTrailingSlash = (path: string): string => {
  return path.endsWith("/") ? path.slice(0, -1) : path;
};

export type GithubDeviceAuthFlowPayload = {
  login: string;
  token: string;
  obtainedAt: number;
};
export async function GithubDeviceAuthFlow({
  corsProxy,
  clientId = Env.PublicGithubClientID,
  scopes = ["public_repo", "private_repo", "repo", "workflow"],
  onVerification,
  onAuthentication,
}: {
  corsProxy?: string;
  clientId?: string;
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
    clientId,
    scopes,
    onVerification,
  });

  const authResult = await auth({ type: "oauth" });

  try {
    const baseUrl = corsProxy ? `${stripTrailingSlash(corsProxy)}/api.github.com` : undefined;
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
