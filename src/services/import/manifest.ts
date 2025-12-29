import { AbsPath } from "@/lib/paths2";

export type WorkspaceImportManifestType = {
  version: number;
  description: string;
  navigate?: AbsPath;
  type: "showcase" | "template";
  ident: string; //less of an id more of identifier to check if the same import
  provider: string;
  details: {
    url: string;
  };
};

export const WorkspaceDefaultManifest = () => ({
  version: 1,
  description: "import",
  type: "template",
});
