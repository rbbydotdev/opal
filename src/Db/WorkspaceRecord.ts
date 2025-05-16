"use client";
import { DiskJType } from "@/Db/Disk";
import { RemoteAuthJType } from "@/Db/RemoteAuth";

export class WorkspaceRecord {
  guid!: string;
  name!: string;
  disk!: DiskJType;
  createdAt!: Date;
  remoteAuth!: RemoteAuthJType;
}
