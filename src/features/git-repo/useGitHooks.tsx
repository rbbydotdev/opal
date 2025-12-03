import { GitPlaybook } from "@/features/git-repo/GitPlaybook";
import { GitRepo, RepoInfoType } from "@/features/git-repo/GitRepo";
import "@/workers/transferHandlers/disk.th";
import "@/workers/transferHandlers/function.th";
import "@/workers/transferHandlers/repo.th";
import * as Comlink from "comlink";
import { useMemo } from "react";
export type WorkspaceRepoType = DeepNonNullable<RepoInfoType, "parentOid" | "currentBranch" | "currentRef">;
