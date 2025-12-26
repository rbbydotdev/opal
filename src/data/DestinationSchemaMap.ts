import { DestinationDAO, RandomTag } from "@/data/dao/DestinationDAO";
import { AgentFromRemoteAuthFactory } from "@/data/remote-auth/AgentFromRemoteAuthFactory";
import { RemoteAuthCloudflareAPIAgent } from "@/data/remote-auth/RemoteAuthCloudflareAPIAgent";
import { coerceRepoToName, RemoteAuthGithubAgent } from "@/data/remote-auth/RemoteAuthGithubAgent";
import { RemoteAuthNetlifyAgent } from "@/data/remote-auth/RemoteAuthNetlifyAgent";
import { RemoteAuthSource } from "@/data/RemoteAuthTypes";
import { unwrapError } from "@/lib/errors/errors";
import { absPath } from "@/lib/paths2";
import { RemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
import z from "zod";

// Single factory function for all destination schemas with optional async validation
export function DestinationSchemaMapFn(remoteAuths: RemoteAuthDAO[], destinationType: DestinationType) {
  const baseSchema = DestinationSchemaMap[destinationType];

  // If no remoteAuths, just return the base schema (no async validation)
  if (!remoteAuths.length) {
    return baseSchema;
  }

  // Add async validation for supported types
  switch (destinationType) {
    // case "github":
    //   return baseSchema.superRefine();

    // case "netlify":
    // return baseSchema.superRefine();

    default:
      return baseSchema;
  }
}

export const DestinationSchemaMap = {
  cloudflare: z
    .object({
      remoteAuthId: z.string().trim().min(1, "Remote Auth ID is required"),
      label: z.string().trim().min(1, "Label is required"),
      meta: z.object({
        accountId: z.string().trim().optional(),
        accountName: z.string().trim().min(1, "Account Name is required"),
        projectName: z.string().trim().min(1, "Project Name is required"),
      }),
    })
    .superRefine(async (data, ctx) => {
      //Abort Signal ???

      try {
        if (data.meta.accountId) return;

        if (!data.meta.accountName || !data.meta.accountName.trim()) return;

        // Get agent using helper function
        const agent = AgentFromRemoteAuthFactory(
          (await RemoteAuthDAO.GetByGuid(data.remoteAuthId))!
        ) as RemoteAuthCloudflareAPIAgent;

        // Look up site by name
        const accountId = (await agent.cloudflareClient.getAccounts()).find(
          (result) => result.name === data.meta.accountName
        )?.id;
        if (!accountId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Account name "${data.meta.accountName}" not found in your Cloudflare account`,
            path: ["meta", "accountName"],
          });
          return;
        }

        // Update the data with the resolved siteId
        // data.meta.accountId = accountId;
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error instanceof Error ? error.message : "Validation failed",
          path: ["meta", "accountName"],
        });
      }
    })
    .default(() => ({
      remoteAuthId: "",
      label: RandomTag("Cloudflare"),
      meta: { accountId: "", accountName: "", projectName: "" },
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
        siteId: z.string().trim().optional(), // Auto-resolved from siteName
      }),
    })
    .superRefine(async (data, ctx) => {
      try {
        // If we already have a siteId, no validation needed
        if (data.meta.siteId && data.meta.siteId.trim()) {
          return;
        }

        // Only validate if siteName is provided
        if (!data.meta.siteName || !data.meta.siteName.trim()) return;

        // Get agent using helper function
        const agent = AgentFromRemoteAuthFactory(
          (await RemoteAuthDAO.GetByGuid(data.remoteAuthId))!
        ) as RemoteAuthNetlifyAgent;

        // Look up site by name
        const siteId = await agent.netlifyClient.getSiteIdByName(data.meta.siteName);
        if (!siteId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Site "${data.meta.siteName}" not found in your Netlify account`,
            path: ["meta", "siteName"],
          });
          return;
        }

        // Update the data with the resolved siteId
        // data.meta.siteId = siteId;
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error instanceof Error ? error.message : "Validation failed",
          path: ["meta", "siteName"],
        });
      }
    })

    .default(() => ({
      remoteAuthId: "",
      label: RandomTag("Netlify"),
      meta: {
        siteName: "",
        siteId: "",
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
        fullName: z.string().trim().optional(), // Auto-resolved full name (owner/repo)
        branch: z.string().trim().min(1, "Branch is required"),
        baseUrl: z.string().trim().min(1, "Base URL is required").transform(absPath),
      }),
    })
    .superRefine(async (data, ctx) => {
      try {
        // Only validate if repository is provided
        if (!data.meta.repository || !data.meta.repository.trim()) return;

        const agent = AgentFromRemoteAuthFactory(
          (await RemoteAuthDAO.GetByGuid(data.remoteAuthId))!
        ) as RemoteAuthGithubAgent;

        // Normalize the repository name

        const normalizedRepo = coerceRepoToName(data.meta.repository);

        // Get the full repository name and validate it exists
        const [owner, repo] = await agent.githubClient.getFullRepoName(normalizedRepo);
        const fullName = `${owner}/${repo}`;

        // Update the data with validated values
        data.meta.repository = normalizedRepo;
        data.meta.fullName = fullName;
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: unwrapError(error).includes("404")
            ? `Repository ${data.meta.repository} not found`
            : unwrapError(error),
          path: ["meta", "repository"],
        });
      }
    })

    .default(() => ({
      remoteAuthId: "",
      label: RandomTag("Github"),
      meta: { repository: "", fullName: "", branch: "gh-pages", baseUrl: "/" },
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
export type GithubDestination = DestinationDAO<z.infer<(typeof DestinationSchemaMap)["github"]>["meta"]>;
export type VercelDestination = DestinationDAO<z.infer<(typeof DestinationSchemaMap)["vercel"]>["meta"]>;
export type NetlifyDestination = DestinationDAO<z.infer<(typeof DestinationSchemaMap)["netlify"]>["meta"]>;
export type CloudflareDestination = DestinationDAO<z.infer<(typeof DestinationSchemaMap)["cloudflare"]>["meta"]>;
export type AWSDestination = DestinationDAO<z.infer<(typeof DestinationSchemaMap)["aws"]>["meta"]>;

export type DestinationProvider<T extends DestinationType> = DestinationDAO<z.infer<(typeof DestinationSchemaMap)[T]>>;
export type CloudflareDestinationMeta = CloudflareDestination["meta"];
export type VercelDestinationMeta = VercelDestination["meta"];
export type NetlifyDestinationMeta = NetlifyDestination["meta"];
export type GithubDestinationMeta = GithubDestination["meta"];
export type AWSDestinationMeta = AWSDestination["meta"];

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
