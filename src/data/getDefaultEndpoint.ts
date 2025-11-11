// import { RemoteAuthSource, RemoteAuthType } from "@/data/RemoteAuthTypes";

// // 5. Endpoint defaults

// export const getDefaultEndpoint = (source: RemoteAuthSource, type: RemoteAuthType): string => {
//   const endpointMap: Record<RemoteAuthSource, Record<RemoteAuthType, string>> = {
//     github: {
//       api: "https://api.github.com",
//       oauth: "https://github.com/login/oauth/authorize",
//       "oauth-device": "https://github.com/login/device/code",
//       "basic-auth": "https://api.github.com",
//       "no-auth": "https://api.github.com",
//     },
//     netlify: {
//       api: "https://api.netlify.com/api/v1",
//       oauth: "https://app.netlify.com/authorize",
//       "oauth-device": "https://app.netlify.com/authorize",
//       "basic-auth": "https://api.netlify.com/api/v1",
//       "no-auth": "https://api.netlify.com/api/v1",
//     },
//     cloudflare: {
//       api: "https://api.cloudflare.com/client/v4",
//       oauth: "https://dash.cloudflare.com/oauth2/auth",
//       "oauth-device": "https://dash.cloudflare.com/oauth2/auth",
//       "basic-auth": "https://api.cloudflare.com/client/v4",
//       "no-auth": "https://api.cloudflare.com/client/v4",
//     },
//     custom: {
//       api: "",
//       oauth: "",
//       "oauth-device": "",
//       "basic-auth": "",
//       "no-auth": "",
//     },
//   };

//   return endpointMap[source]?.[type] ?? "";
// };
