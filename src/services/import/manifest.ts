import { AbsPath } from "@/lib/paths2";
import { z } from "zod";

export const WorkspaceImportManifestSchema = z
  .object({
    version: z.number().default(1).catch(1),
    description: z.string().default("import").catch("import"),
    navigate: z.string().brand<AbsPath>().optional().catch(undefined),
    type: z
      .union([z.literal("showcase"), z.literal("template")])
      .default("template")
      .catch("template"),
    ident: z.string().default("").catch(""),
    provider: z.string().optional().catch(undefined),
    details: z
      .object({
        url: z.string(),
      })
      .optional()
      .catch(undefined),
  })
  .passthrough(); // Allow unrecognized keys

export type WorkspaceImportManifestType = z.infer<typeof WorkspaceImportManifestSchema>;

export type WorkspaceImportManifestTypeMinimal = Pick<WorkspaceImportManifestType, "version" | "description" | "type">;

export const WorkspaceDefaultManifest = (ident: string) =>
  ({
    version: 1,
    description: "import",
    type: "template",
    ident,
  }) satisfies WorkspaceImportManifestType;
