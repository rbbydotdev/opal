import { DestinationDAO, RandomTag } from "@/data/DAO/DestinationDAO";
import { RemoteAuthSource } from "@/data/RemoteAuthTypes";
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
        repository: z.string().trim().min(1, "Repository is required"),
        branch: z.string().trim().min(1, "Branch is required"),
      }),
    })
    .default(() => ({
      remoteAuthId: "",
      label: RandomTag("Github"),
      meta: { repository: "", branch: "gh-pages" },
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
type CloudflareDestinationData = z.infer<(typeof DestinationSchemaMap)["cloudflare"]>["meta"];
class CloudflareDestination extends DestinationDAO<CloudflareDestinationData> {}
type NetlifyDestinationData = z.infer<(typeof DestinationSchemaMap)["netlify"]>["meta"];
class NetlifyDestination extends DestinationDAO<NetlifyDestinationData> {}
type AWSDestinationData = z.infer<(typeof DestinationSchemaMap)["aws"]>["meta"];
class AWSDestination extends DestinationDAO<AWSDestinationData> {}
type GitHubDestinationData = z.infer<(typeof DestinationSchemaMap)["github"]>["meta"];
class GitHubDestination extends DestinationDAO<GitHubDestinationData> {}
type VercelDestinationData = z.infer<(typeof DestinationSchemaMap)["vercel"]>["meta"];
class VercelDestination extends DestinationDAO<VercelDestinationData> {}
