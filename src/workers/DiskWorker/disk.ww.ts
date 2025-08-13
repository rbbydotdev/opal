import * as Comlink from "comlink";

import { Disk } from "@/Db/Disk";
import "@/workers/transferHandlers/disk.th";
import "@/workers/transferHandlers/function.th";
import "@/workers/transferHandlers/treeNode.th";

Comlink.expose(Disk);
