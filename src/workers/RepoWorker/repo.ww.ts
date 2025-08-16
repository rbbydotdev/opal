import { GitRepo } from "@/features/git-repo/GitRepo";
import * as Comlink from "comlink";

import "@/workers/transferHandlers/disk.th";
import "@/workers/transferHandlers/function.th";
import "@/workers/transferHandlers/repo.th";

Comlink.expose(GitRepo);
