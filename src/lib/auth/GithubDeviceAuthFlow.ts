import { NotEnv } from "@/lib/notenv";
import { createOAuthDeviceAuth, OAuthAppAuthentication } from "@octokit/auth-oauth-device";
import { request } from "@octokit/request";
import { OnVerificationCallback } from "../../../node_modules/@octokit/auth-oauth-device/dist-types/types";
// GithubVarer{
//    device_code: "3584d83530557fdd1f46af8289938c8ef79f9dc5",
//    user_code: "WDJB-MJHT",
//    verification_uri: "https://github.com/login/device",
//    expires_in: 900,
//    interval: 5,
//  };

export async function GithubDeviceAuthFlow({
  corsProxy,
  clientId = NotEnv.PublicGithubClientID,
  scopes = ["public_repo", "private_repo", "repo", "workflow"],
  onVerification,
  onAuthentication,
}: {
  corsProxy?: string;
  clientId?: string;
  scopes?: string[];
  onVerification: OnVerificationCallback;
  onVerificationError?: (error: Error) => void;
  onAuthentication?: (auth: OAuthAppAuthentication) => void;
}) {
  const proxiedRequest = corsProxy
    ? request.defaults({
        baseUrl: corsProxy + "/github.com",
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

  onAuthentication?.(authResult);

  return authResult;
}
