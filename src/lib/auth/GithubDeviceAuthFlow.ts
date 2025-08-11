import { createOAuthDeviceAuth, OAuthAppAuthentication } from "@octokit/auth-oauth-device";
import { OnVerificationCallback } from "../../../node_modules/@octokit/auth-oauth-device/dist-types/types";
// GithubVarer{
//    device_code: "3584d83530557fdd1f46af8289938c8ef79f9dc5",
//    user_code: "WDJB-MJHT",
//    verification_uri: "https://github.com/login/device",
//    expires_in: 900,
//    interval: 5,
//  };

export async function GithubDeviceAuthFlow({
  clientId = process.env.PUBLIC_GITHUB_CLIENT_ID!,
  scopes = ["public_repo", "private_repo", "repo", "workflow"],
  onVerification,
  onAuthentication,
}: {
  clientId?: string;
  scopes?: string[];
  onVerification: OnVerificationCallback;
  onAuthentication?: (auth: OAuthAppAuthentication) => void;
}) {
  const auth = createOAuthDeviceAuth({
    clientType: "oauth-app",
    clientId,
    scopes,
    onVerification,
  });

  const authResult = await auth({ type: "oauth" });

  onAuthentication?.(authResult);

  return authResult;
}
