// List of AWS regions and their human-friendly display names
import { BucketLocationConstraint } from "@aws-sdk/client-s3";

export const AWS_REGIONS = Object.entries(BucketLocationConstraint).map(([key, value]) => ({
  value,
  label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
}));

// --- Types ---
export type AWSRegion = (typeof AWS_REGIONS)[number];
export type AWSRegionCode = AWSRegion["value"];

// --- Internal Map for Fast Lookups ---
const REGION_MAP: Record<AWSRegionCode, string> = Object.fromEntries(
  AWS_REGIONS.map((r) => [r.value, r.label])
) as Record<AWSRegionCode, string>;

// --- Helpers ---

/**
 * Returns the human-readable name of an AWS region.
 * Falls back to regionCode if not found.
 */
export function getRegionDisplayName(regionCode: string): string {
  const label = REGION_MAP[regionCode as AWSRegionCode];
  if (label) {
    return `${label} -- ${regionCode}`;
  }
  return regionCode;
}

/**
 * Checks if a given string is a valid AWS region code.
 */
export function isValidRegion(regionCode: string): regionCode is AWSRegionCode {
  return regionCode in REGION_MAP;
}

/**
 * Returns all AWS region codes.
 */
export function getAllRegionCodes(): AWSRegionCode[] {
  return AWS_REGIONS.map((r) => r.value);
}

/**
 * Returns all AWS regions with both values & labels.
 */
export function getAllRegions(): readonly AWSRegion[] {
  return AWS_REGIONS;
}
