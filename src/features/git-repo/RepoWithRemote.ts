import { Disk } from "@/data/disk/Disk";
import { GitRepo, IRemote } from "@/features/git-repo/GitRepo";
import { Remote } from "@/features/git-repo/Remote";
import { AbsPath } from "@/lib/paths2";
import { AuthCallback } from "isomorphic-git";

export class RepoWithRemote extends GitRepo {
  readonly gitRemote: Remote;

  state: {
    initialized: boolean;
    remoteOK: boolean;
    fullInitialized: boolean;
    bareInitialized: boolean;
  } = {
    initialized: false,
    remoteOK: false,
    fullInitialized: false,
    bareInitialized: false,
  };

  constructor(
    {
      guid,
      disk,
      dir,
      branch,
    }: {
      guid: string;
      disk: Disk;
      dir: AbsPath;
      branch: string;
      remoteBranch?: string;
      remoteName: string;
      url: string;
      auth?: AuthCallback;
    },
    remote: IRemote | Remote
  ) {
    super({ guid, disk, dir, defaultBranch: branch });
    this.gitRemote = remote instanceof Remote ? remote : new Remote(remote);
  }

  get isRemoteOk() {
    return this.state.remoteOK;
  }
  async _ready() {
    if (this.state.remoteOK && this.state.initialized) return true;
    return (
      (this.state.remoteOK = await this.assertRemoteOK()) && (this.state.initialized = await this.mustBeInitialized())
    );
  }

  async assertRemoteOK({ verifyOrThrow }: { verifyOrThrow: boolean } = { verifyOrThrow: false }) {
    if (this.state.remoteOK) return true;
    const verifyCode = await this.gitRemote.verifyRemote();
    if (verifyCode !== Remote.VERIFY_CODES.SUCCESS) {
      if (verifyOrThrow) throw new Error(`Remote verification failed with code: ${verifyCode}`);
      return (this.state.remoteOK = false);
    }
    return (this.state.remoteOK = true);
  }
}
