import * as Comlink from "comlink";

import { Workspace } from "@/data/Workspace";
import "@/workers/transferHandlers/disk.th";
import "@/workers/transferHandlers/function.th";
import "@/workers/transferHandlers/treeNode.th";

Comlink.expose(Workspace);
