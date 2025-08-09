import { createOAuthDeviceAuth } from "@octokit/auth-oauth-device";
import { OAuthAppAuthentication, OnVerificationCallback } from "@octokit/auth-oauth-device/dist-types/types";
// GithubVarer{
//    device_code: "3584d83530557fdd1f46af8289938c8ef79f9dc5",
//    user_code: "WDJB-MJHT",
//    verification_uri: "https://github.com/login/device",
//    expires_in: 900,
//    interval: 5,
//  };

export async function GithubDeviceAuth({
  clientId,
  scopes = ["public_repo", "private_repo", "repo", "workflow"],
  onVerification,
  onAuthentication,
}: {
  clientId: string;
  scopes: string[];
  onVerification: OnVerificationCallback;
  onAuthentication?: (tokenAuthenticatoin: OAuthAppAuthentication) => void;
}) {
  const auth = createOAuthDeviceAuth({
    clientType: "oauth-app",
    clientId,
    scopes,
    onVerification,
    // onVerification(verification) {
    //   // verification example
    //   // {
    //   //   device_code: "3584d83530557fdd1f46af8289938c8ef79f9dc5",
    //   //   user_code: "WDJB-MJHT",
    //   //   verification_uri: "https://github.com/login/device",
    //   //   expires_in: 900,
    //   //   interval: 5,
    //   // };
    //   console.log("Open %s", verification.verification_uri);
    //   console.log("Enter code: %s", verification.user_code);
    // },
  });
  const authResult = await auth({
    type: "oauth",
  });
  if (onAuthentication) {
    onAuthentication(authResult);
  }
  return authResult;
}
