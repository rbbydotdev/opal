// List of AWS regions and their human-friendly display names
export const AWS_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-east-2", label: "US East (Ohio)" },
  { value: "us-west-1", label: "US West (N. California)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "af-south-1", label: "Africa (Cape Town)" },
  { value: "ap-east-1", label: "Asia Pacific (Hong Kong)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { value: "ap-northeast-2", label: "Asia Pacific (Seoul)" },
  { value: "ap-northeast-3", label: "Asia Pacific (Osaka)" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
  { value: "ap-south-2", label: "Asia Pacific (Hyderabad)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
  { value: "ap-southeast-3", label: "Asia Pacific (Jakarta)" },
  { value: "ap-southeast-4", label: "Asia Pacific (Melbourne)" },
  { value: "ca-central-1", label: "Canada (Central)" },
  { value: "ca-west-1", label: "Canada (Calgary)" },
  { value: "eu-central-1", label: "Europe (Frankfurt)" },
  { value: "eu-central-2", label: "Europe (Zurich)" },
  { value: "eu-north-1", label: "Europe (Stockholm)" },
  { value: "eu-south-1", label: "Europe (Milan)" },
  { value: "eu-south-2", label: "Europe (Spain)" },
  { value: "eu-west-1", label: "Europe (Ireland)" },
  { value: "eu-west-2", label: "Europe (London)" },
  { value: "eu-west-3", label: "Europe (Paris)" },
  { value: "il-central-1", label: "Israel (Tel Aviv)" },
  { value: "me-central-1", label: "Middle East (UAE)" },
  { value: "me-south-1", label: "Middle East (Bahrain)" },
  { value: "sa-east-1", label: "South America (São Paulo)" },
  // { value: "us-gov-east-1", label: "AWS GovCloud (US-East)" },
  // { value: "us-gov-west-1", label: "AWS GovCloud (US-West)" },
] as const;

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
