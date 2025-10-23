import { DiskJType } from "@/Db/Disk";
import { RemoteAuthRecord } from "@/Db/RemoteAuth";
import { WorkspaceStatusCode } from "@/Db/WorkspaceStatusCode";

export class WorkspaceRecord {
  guid!: string;
  name!: string;
  disk!: DiskJType;
  thumbs!: DiskJType;
  code!: WorkspaceStatusCode;
  remoteAuths!: RemoteAuthRecord[];
}
