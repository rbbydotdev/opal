import { RemoteAuthRecord } from "@/data/RemoteAuthTypes";
import { WorkspaceStatusCode } from "@/data/WorkspaceStatusCode";
import { DiskJType } from "./DiskType";

export class WorkspaceRecord {
  guid!: string;
  name!: string;
  disk!: DiskJType;
  thumbs!: DiskJType;
  code!: WorkspaceStatusCode;
  remoteAuths!: RemoteAuthRecord[];
  timestamp?: number;
}
