import { BuildLogLine, BuildRecord } from "@/data/BuildRecord";
import { Disk } from "@/data/disk/Disk";
import { DiskFromJSON } from "@/data/disk/DiskFactory";
import { DiskJType } from "@/data/DiskType";
import { ClientDb } from "@/data/instance";
import { NullDisk } from "@/data/NullDisk";
import { PublicationDAO, PublicationJType } from "@/data/PublicationDAO";
import { SpecialDirs } from "@/data/SpecialDirs";
import { absPath, AbsPath, joinPath, relPath } from "@/lib/paths2";
import { nanoid } from "nanoid";

export type BuildJType = ReturnType<typeof BuildDAO.prototype.toJSON>;

export class BuildDAO implements BuildRecord {
  guid: string;
  disk: Disk | DiskJType;
  label: string;
  fileCount: number;
  timestamp: Date;
  status: "idle" | "pending" | "success" | "failed" | "cancelled";
  workspaceId: string;
  buildPath: AbsPath;
  logs: BuildLogLine[];
  publications: (PublicationJType | PublicationDAO)[] = [];

  static guid = () => "build_id_" + nanoid();

  constructor({ guid, label, timestamp, fileCount, disk, workspaceId, buildPath, logs }: Omit<BuildRecord, "status">) {
    this.guid = guid;
    this.label = label;
    this.timestamp = timestamp;
    this.fileCount = fileCount;
    this.disk = disk;
    this.workspaceId = workspaceId;
    this.buildPath = buildPath;
    this.status = "idle";
    this.logs = logs;
  }

  static FromJSON(json: BuildJType) {
    return new BuildDAO(json);
  }

  toJSON() {
    return {
      guid: this.guid,
      label: this.label,
      timestamp: this.timestamp,
      disk: this.disk,
      workspaceId: this.workspaceId,
      buildPath: this.buildPath,
      logs: this.logs,
      fileCount: this.fileCount,
    };
  }

  static CreateNew({
    label,
    disk,
    workspaceId,
    guid = BuildDAO.guid(),
    fileCount = 0,
    logs = [],
  }: {
    label: string;
    disk: Disk | DiskJType;
    workspaceId: string;
    guid?: string;
    fileCount?: number;
    logs: BuildLogLine[];
  }) {
    const buildPath = joinPath(SpecialDirs.Build, relPath(guid));
    return new BuildDAO({
      guid,
      label,
      timestamp: new Date(),
      disk: disk instanceof Disk ? disk : DiskFromJSON(disk),
      workspaceId,
      buildPath,
      logs,
      fileCount,
    });
  }

  static async FetchFromGuid(guid: string) {
    const result = await ClientDb.builds.where("guid").equals(guid).first();
    if (!result) return result;
    return BuildDAO.FromJSON(result);
  }

  static async all() {
    return (await ClientDb.builds.orderBy("timestamp").toArray()).map(BuildDAO.FromJSON);
  }

  static async allForWorkspace(workspaceId: string) {
    const builds = await ClientDb.builds.where("workspaceId").equals(workspaceId).reverse().sortBy("timestamp");
    return builds.map((build) => BuildDAO.FromJSON(build));
  }

  static async allForDisk(diskId: string) {
    const builds = await ClientDb.builds.where("diskId").equals(diskId).reverse().sortBy("timestamp");
    return builds.map((build) => BuildDAO.FromJSON(build));
  }

  async hydrate() {
    const build = await BuildDAO.FetchFromGuid(this.guid);
    if (build) {
      Object.assign(this, build);
    }
    return this;
  }

  async update({ ...properties }: Partial<Omit<BuildRecord, "guid">>) {
    await ClientDb.builds.update(this.guid, properties);
    for (const [key, value] of Object.entries(properties)) {
      (this as any)[key] = value;
    }
    return this;
  }

  save() {
    return ClientDb.builds.put({
      guid: this.guid,
      label: this.label,
      timestamp: this.timestamp,
      workspaceId: this.workspaceId,
      disk: this.disk instanceof Disk ? (this.disk.toJSON() as DiskJType) : this.disk,
      buildPath: this.buildPath,
      logs: this.logs,
      status: this.status,
      fileCount: this.fileCount,
    });
  }

  getBuildPath(): AbsPath {
    return this.buildPath;
  }

  get Disk() {
    return (this.disk = this.disk instanceof Disk ? this.disk : DiskFromJSON(this.disk));
  }

  async delete() {
    try {
      await this.Disk.removeMultipleFiles([this.buildPath]);
    } catch (error) {
      console.error(`Failed to remove build files at ${this.buildPath}:`, error);
    }
    return BuildDAO.delete(this.guid);
  }
  static delete(guid: string) {
    return ClientDb.builds.delete(guid);
  }
}

export class NullBuildDAO extends BuildDAO {
  constructor() {
    super({
      guid: "_null_build_",
      label: "NullBuild",
      timestamp: new Date(0),
      disk: new NullDisk().toJSON(),
      workspaceId: "",
      buildPath: absPath("/"),
      logs: [],
      fileCount: 0,
    });
  }
}

export const NULL_BUILD = new NullBuildDAO();
