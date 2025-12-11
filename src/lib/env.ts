/// <reference types="vite/types/importMeta.d.ts" />

const CORS_PROXY_DEFAULT = "https://all-api-proxy.rbbydotdev.workers.dev";

export const ENV: {
  PUBLIC_GITHUB_CLIENT_ID: string;
  PUBLIC_NETLIFY_CLIENT_ID: string;
  PUBLIC_VERCEL_CLIENT_ID: string;
  GIT_PROTOCOL_PROXY: string;
  GITHUB_CORS_PROXY: string;
  CLOUDFLARE_CORS_PROXY: string;
  NETLIFY_CORS_PROXY: string;
  VERCEL_CORS_PROXY: string;
  AWS_CORS_PROXY: string;
  PRIVATE_CORS_PROXY: string;
  HOST_URLS: string[];
} = {
  PUBLIC_GITHUB_CLIENT_ID: import.meta.env.VITE_PUBLIC_GITHUB_CLIENT_ID || "Ov23lipqkfiZDSS9HrCI",
  PUBLIC_NETLIFY_CLIENT_ID: import.meta.env.VITE_PUBLIC_NETLIFY_CLIENT_ID || "wDCLyXefml-6EbcYCB1Ny0j_xDdlAK7io33K6MMekWQ",
  PUBLIC_VERCEL_CLIENT_ID: import.meta.env.VITE_PUBLIC_VERCEL_CLIENT_ID || "cl_sSf8P5pPHKSVnyvmZQUzFQdeNma6bx15",
  GIT_PROTOCOL_PROXY: import.meta.env.VITE_GIT_PROTOCOL_PROXY || "https://git-protocol-proxy.rbbydotdev.workers.dev",
  GITHUB_CORS_PROXY: import.meta.env.VITE_CORS_PROXY || CORS_PROXY_DEFAULT,
  CLOUDFLARE_CORS_PROXY: import.meta.env.VITE_CORS_PROXY || CORS_PROXY_DEFAULT,
  NETLIFY_CORS_PROXY: import.meta.env.VITE_CORS_PROXY || CORS_PROXY_DEFAULT,
  VERCEL_CORS_PROXY: import.meta.env.VITE_CORS_PROXY || CORS_PROXY_DEFAULT,
  AWS_CORS_PROXY: import.meta.env.VITE_CORS_PROXY || CORS_PROXY_DEFAULT,
  PRIVATE_CORS_PROXY: import.meta.env.VITE_PRIVATE_CORS_PROXY || "",
  HOST_URLS: (import.meta.env.VITE_HOST_URLS || "https://opaledx.com,http://localhost:3000,http://localhost").split(","),
};
