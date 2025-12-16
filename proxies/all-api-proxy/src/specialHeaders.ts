// Base headers that are always allowed
export const BASE_HEADERS = [
  "Content-Type",
  "Authorization",
  "authorization",
  "X-Requested-With",
  "Accept",
  "Accept-Encoding",
  "Accept-Language",
  "User-Agent",
  "Cache-Control",
  "Pragma",
] as const;

// AWS SDK specific headers (non x-amz-)
export const AWS_SDK_HEADERS = ["amz-sdk-invocation-id", "amz-sdk-request"] as const;

// Helper function to check if a header is an AWS header
export function isAwsHeader(headerName: string): boolean {
  const lowerHeader = headerName.toLowerCase();
  return lowerHeader.startsWith("x-amz-") || lowerHeader.startsWith("amz-");
}

// Common AWS S3 headers that we need to explicitly list
const AWS_S3_HEADERS = [
  "x-amz-date",
  "x-amz-content-sha256",
  "x-amz-security-token",
  "x-amz-user-agent",
  "x-amz-target",
  "x-amz-acl",
  "x-amz-server-side-encryption",
  "x-amz-request-payer",
  "x-amz-storage-class",
  "x-amz-metadata-directive",
  "x-amz-tagging-directive",
] as const;

const AWS_RESPONSE_HEADERS = [
  "etag",
  "x-amz-version-id",
  "x-amz-delete-marker",
  "x-amz-server-side-encryption",
  "x-amz-request-charged",
  "x-amz-replication-status",
  "x-amz-storage-class",
] as const;

// Get all allowed headers - Cloudflare Workers support these as arrays
export function getAllowedHeaders(): string[] {
  return [...BASE_HEADERS, ...AWS_SDK_HEADERS, ...AWS_S3_HEADERS];
}

// Get exposed headers
export function getExposedHeaders(): string[] {
  return [...AWS_RESPONSE_HEADERS];
}
