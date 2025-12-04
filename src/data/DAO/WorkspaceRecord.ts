import { DiskJType } from "@/data/disk/DiskType";
import { RemoteAuthRecord } from "@/data/RemoteAuthTypes";
import { WorkspaceStatusCode } from "@/data/WorkspaceStatusCode";

export class WorkspaceRecord {
  guid!: string;
  name!: string;
  disk!: DiskJType;
  thumbs!: DiskJType;
  code!: WorkspaceStatusCode;
  remoteAuths!: RemoteAuthRecord[];
  timestamp?: number;
}
