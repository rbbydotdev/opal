// List of AWS regions and their human-friendly display names
import { BucketLocationConstraint } from "@aws-sdk/client-s3";

export const AWS_REGIONS = [
  ...Object.entries(BucketLocationConstraint).map(([key, value]) => ({
    value,
    label: value,
    // label: key.replace(/_/g, "-").replace(/\b\w/g, (c) => c.toUpperCase()),
  })),
  {
    value: "us-east-1",
    label: "us-east-1",
  },
];

// --- Types ---
type AWSRegion = (typeof AWS_REGIONS)[number];
