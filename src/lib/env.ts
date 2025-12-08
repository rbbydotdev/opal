/// <reference types="vite/types/importMeta.d.ts" />

function getRequiredEnvVar(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

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
  PUBLIC_GITHUB_CLIENT_ID: getRequiredEnvVar("VITE_PUBLIC_GITHUB_CLIENT_ID"),
  PUBLIC_NETLIFY_CLIENT_ID: getRequiredEnvVar("VITE_PUBLIC_NETLIFY_CLIENT_ID"),
  PUBLIC_VERCEL_CLIENT_ID: getRequiredEnvVar("VITE_PUBLIC_VERCEL_CLIENT_ID"),
  GIT_PROTOCOL_PROXY: getRequiredEnvVar("VITE_GIT_PROTOCOL_PROXY"),
  GITHUB_CORS_PROXY: getRequiredEnvVar("VITE_GITHUB_CORS_PROXY"),
  CLOUDFLARE_CORS_PROXY: getRequiredEnvVar("CLOUDFLARE_CORS_PROXY"),
  NETLIFY_CORS_PROXY: getRequiredEnvVar("VITE_NETLIFY_CORS_PROXY"),
  VERCEL_CORS_PROXY: getRequiredEnvVar("VITE_VERCEL_CORS_PROXY"),
  AWS_CORS_PROXY: getRequiredEnvVar("VITE_AWS_CORS_PROXY"),
  PRIVATE_CORS_PROXY: import.meta.env.VITE_PRIVATE_CORS_PROXY || "",
  HOST_URLS: getRequiredEnvVar("VITE_HOST_URLS").split(","),
};
