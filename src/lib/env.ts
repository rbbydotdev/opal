export const ENV = {
  PUBLIC_GITHUB_CLIENT_ID: import.meta.env.VITE_PUBLIC_GITHUB_CLIENT_ID || "Ov23lipqkfiZDSS9HrCI",
  PUBLIC_NETLIFY_CLIENT_ID: import.meta.env.VITE_PUBLIC_NETLIFY_CLIENT_ID || "YOUR_NETLIFY_CLIENT_ID",
  GIT_PROTOCOL_PROXY: import.meta.env.VITE_GIT_PROTOCOL_PROXY || "https://git-protocol-proxy.rbbydotdev.workers.dev",
  GITHUB_CORS_PROXY: import.meta.env.VITE_GITHUB_CORS_PROXY || "https://github-api-proxy.rbbydotdev.workers.dev",
  PRIVATE_CORS_PROXY: import.meta.env.VITE_PRIVATE_CORS_PROXY || "https://private-cors-proxy.rbbydotdev.workers.dev",
};
