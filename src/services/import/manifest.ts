import { AbsPath } from "@/lib/paths2";
import { z } from "zod";

export const WorkspaceImportManifestSchema = z.object({
  version: z.number(),
  description: z.string().optional(),
  navigate: z.string().brand<AbsPath>().optional(),
  type: z.union([z.literal("showcase"), z.literal("template")]),
  ident: z.string(),
  provider: z.string().optional(),
  details: z
    .object({
      url: z.string(),
    })
    .optional(),
});

export type WorkspaceImportManifestType = z.infer<typeof WorkspaceImportManifestSchema>;

export type WorkspaceImportManifestTypeMinimal = Pick<WorkspaceImportManifestType, "version" | "description" | "type">;

export const WorkspaceDefaultManifest = (ident: string) =>
  ({
    version: 1,
    description: "import",
    type: "template",
    ident,
  }) satisfies WorkspaceImportManifestType;
