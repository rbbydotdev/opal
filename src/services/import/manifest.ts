import { AbsPath } from "@/lib/paths2";

export type WorkspaceImportManifestType = {
  version: number;
  description: string;
  navigate?: AbsPath;
  type: "showcase" | "template";
};

export const WorkspaceDefaultManifest = {
  version: 1,
  description: "import",
  type: "template",
};
