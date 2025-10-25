import { RemoteAuthRecord } from "@/Db/RemoteAuth";
import { WorkspaceStatusCode } from "@/Db/WorkspaceStatusCode";
import { DiskJType } from "./DiskType";

export class WorkspaceRecord {
  guid!: string;
  name!: string;
  disk!: DiskJType;
  thumbs!: DiskJType;
  code!: WorkspaceStatusCode;
  remoteAuths!: RemoteAuthRecord[];
}
