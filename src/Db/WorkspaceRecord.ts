import { DiskJType } from "@/Db/Disk";
import { RemoteAuthRecord } from "@/Db/RemoteAuth";
// import { RemoteAuthJType } from "@/Db/RemoteAuth";

export class WorkspaceRecord {
  guid!: string;
  name!: string;
  disk!: DiskJType;
  thumbs!: DiskJType;
  remoteAuths!: RemoteAuthRecord[];
}
