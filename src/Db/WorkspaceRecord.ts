"use client";
import { DiskJType } from "@/Db/Disk";
import { RemoteAuthJType } from "@/Db/RemoteAuth";

export class WorkspaceRecord {
  guid!: string;
  name!: string;
  disk!: DiskJType;
  thumbs!: DiskJType;
  createdAt!: Date;
  remoteAuth!: RemoteAuthJType;
}
