import { GitRepo, RepoJType } from "@/features/git-repo/GitRepo";
import { transferHandlers } from "comlink";

transferHandlers.set("Repo", {
  canHandle: (obj): obj is GitRepo => obj instanceof GitRepo,
  serialize: (obj: GitRepo) => {
    return [
      { value: obj.toJSON() }, // Only serializable data
      [], // No transferable objects
    ];
  },
  deserialize: (serialized: { value: RepoJType }) => {
    return GitRepo.FromJSON(serialized.value);
  },
});
