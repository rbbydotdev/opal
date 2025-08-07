import { Repo, RepoJType } from "@/features/git-repo/GitRepo";
import { transferHandlers } from "comlink";

transferHandlers.set("Repo", {
  canHandle: (obj): obj is Repo => obj instanceof Repo,
  serialize: (obj: Repo) => {
    return [
      { value: obj.toJSON() }, // Only serializable data
      [], // No transferable objects
    ];
  },
  deserialize: (serialized: { value: RepoJType }) => {
    return Repo.FromJSON(serialized.value);
  },
});
