import { DestinationDAO, RandomTag } from "@/data/dao/DestinationDAO";
import { RemoteAuthSource } from "@/data/RemoteAuthTypes";
import { absPath } from "@/lib/paths2";
import z from "zod";

export const DestinationSchemaMap = {
  cloudflare: z
    .object({
      remoteAuthId: z.string().trim().min(1, "Remote Auth ID is required"),
      label: z.string().trim().min(1, "Label is required"),
      meta: z.object({
        accountId: z.string().trim().min(1, "Account ID is required"),
        projectName: z.string().trim().min(1, "Project Name is required"),
      }),
    })

    .default(() => ({
      remoteAuthId: "",
      label: RandomTag("Cloudflare"),
      meta: { accountId: "", projectName: "" },
    })),
  vercel: z
    .object({
      remoteAuthId: z.string().trim().min(1, "Remote Auth ID is required"),
      label: z.string().trim().min(1, "Label is required"),
      meta: z.object({
        /*
        : "Project names can be up to 100 characters long and must be lowercase. They can include letters, digits, and the following characters: '.', '_', '-'. However, they cannot contain the sequence '---'
        */
        project: z
          .string()
          .trim()
          .min(1, "Project is required")
          .max(100, "Project name is too long")
          .regex(/^[a-z0-9._-]+$/, "Project name must be lowercase and can include letters, digits, '.', '_', and '-'")
          .refine((val) => !val.includes("---"), "Project name cannot contain the sequence '---'"),
        // implicit! projectId: z.string().trim(),
        // implicit! teamId: z.string().trim().optional(),
      }),
    })

    .default(() => ({
      remoteAuthId: "",
      label: RandomTag("Vercel"),
      meta: {
        project: "",
      },
    })),
  netlify: z
    .object({
      remoteAuthId: z.string().trim(),
      label: z.string().trim().min(1, "Label is required"),
      meta: z.object({
        // implicit! accountId: z.string().trim(),
        siteName: z.string().trim().min(1, "Site Name is required"),
      }),
    })

    .default(() => ({
      remoteAuthId: "",
      label: RandomTag("Netlify"),
      meta: {
        siteName: "",
      },
    })),
  github: z
    .object({
      remoteAuthId: z.string().trim().min(1, "Remote Auth ID is required"),
      label: z.string().trim().min(1, "Label is required"),
      meta: z.object({
        repository: z
          .string()
          .trim()
          .min(1, "Repository is required")
          .regex(
            /^([^/]+|[^/]+\/[^/]+)$/,
            "Repository must be a single string or a string in the format '<min 1 char>/<min 1 char>'"
          ),
        branch: z.string().trim().min(1, "Branch is required"),
        baseUrl: z.string().trim().min(1, "Base URL is required").transform(absPath),
      }),
    })

    .default(() => ({
      remoteAuthId: "",
      label: RandomTag("Github"),
      meta: { repository: "", branch: "gh-pages", baseUrl: "/" },
    })),
  aws: z
    .object({
      remoteAuthId: z.string().trim().min(1, "Remote Auth ID is required"),
      label: z.string().trim().min(1, "Label is required"),
      meta: z.object({
        bucketName: z.string().trim().min(1, "Bucket name is required").toLowerCase(),
        region: z.string().trim().min(1, "Region is required"),
      }),
    })

    .default(() => ({
      remoteAuthId: "",
      label: RandomTag("AWS"),
      meta: { bucketName: "", region: "us-east-1" },
    })),
  custom: z
    .object({
      remoteAuthId: z.string().trim().default(""),
      label: z.string().trim().default(""),
      meta: z.object({}),
    })

    .default(() => ({
      remoteAuthId: "",
      label: "",
      meta: {
        endpoint: z.string().trim().url().default("https://example.com"),
      },
    })),
} satisfies Record<RemoteAuthSource, z.ZodTypeAny>;
export type DestinationType = keyof typeof DestinationSchemaMap;
export type DestinationSchemaTypeMap<DestinationType extends keyof typeof DestinationSchemaMap> = z.infer<
  (typeof DestinationSchemaMap)[DestinationType]
>;
export type GithubDestination = DestinationDAO<z.infer<(typeof DestinationSchemaMap)["github"]>>;
export type DestinationProvider<T extends DestinationType> = DestinationDAO<z.infer<(typeof DestinationSchemaMap)[T]>>;
// Type guards using Zod branded types
export type CloudflareDestinationMeta = z.infer<typeof DestinationSchemaMap.cloudflare>["meta"];
export type VercelDestinationMeta = z.infer<typeof DestinationSchemaMap.vercel>["meta"];
export type NetlifyDestinationMeta = z.infer<typeof DestinationSchemaMap.netlify>["meta"];
export type GithubDestinationMeta = z.infer<typeof DestinationSchemaMap.github>["meta"];
export type AWSDestinationMeta = z.infer<typeof DestinationSchemaMap.aws>["meta"];

export function isCloudflareDestination(dest: DestinationDAO): dest is DestinationDAO<CloudflareDestinationMeta> {
  return dest.provider === "cloudflare";
}

export function isVercelDestination(dest: DestinationDAO): dest is DestinationDAO<VercelDestinationMeta> {
  return dest.provider === "vercel";
}

export function isNetlifyDestination(dest: DestinationDAO): dest is DestinationDAO<NetlifyDestinationMeta> {
  return dest.provider === "netlify";
}

export function isGithubDestination(dest: DestinationDAO): dest is DestinationDAO<GithubDestinationMeta> {
  return dest.provider === "github";
}

export function isAWSDestination(dest: DestinationDAO): dest is DestinationDAO<AWSDestinationMeta> {
  return dest.provider === "aws";
}

type CustomDestinationMeta = z.infer<typeof DestinationSchemaMap.custom>["meta"];

export function isCustomDestination(dest: DestinationDAO): dest is DestinationDAO<CustomDestinationMeta> {
  return dest.provider === "custom";
}
export const DestinationTypes = Object.keys(DestinationSchemaMap) as DestinationType[];
