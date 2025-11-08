import { BuildLogLine, BuildRecord } from "@/data/BuildRecord";
import { Disk } from "@/data/disk/Disk";
import { DiskFromJSON } from "@/data/disk/DiskFactory";
import { DiskJType } from "@/data/DiskType";
import { ClientDb } from "@/data/instance";
import { NullDisk } from "@/data/NullDisk";
import { SpecialDirs } from "@/data/SpecialDirs";
import { absPath, AbsPath, joinPath, relPath } from "@/lib/paths2";
import { nanoid } from "nanoid";

export type BuildJType = ReturnType<typeof BuildDAO.prototype.toJSON>;

export class BuildDAO implements BuildRecord {
  guid: string;
  disk: Disk | DiskJType;
  label: string;
  timestamp: Date;
  status: "idle" | "pending" | "success" | "failed" | "cancelled";
  workspaceId: string;
  buildPath: AbsPath;
  logs: BuildLogLine[];

  static guid = () => "build_id_" + nanoid();

  constructor(build: Omit<BuildRecord, "status">) {
    this.guid = build.guid;
    this.label = build.label;
    this.timestamp = build.timestamp;
    this.disk = build.disk;
    this.workspaceId = build.workspaceId;
    this.buildPath = build.buildPath;
    this.status = "idle";
    this.logs = build.logs;
  }

  static FromJSON(json: BuildJType) {
    return new BuildDAO(json);
  }

  toJSON() {
    return {
      guid: this.guid,
      label: this.label,
      timestamp: this.timestamp,
      disk: this.disk instanceof Disk ? (this.disk.toJSON() as DiskJType) : this.disk,
      workspaceId: this.workspaceId,
      buildPath: this.buildPath,
      logs: this.logs,
    };
  }

  static CreateNew({
    label,
    disk,
    workspaceId,
    guid = BuildDAO.guid(),
  }: {
    label: string;
    disk: Disk | DiskJType;
    workspaceId: string;
    guid?: string;
  }) {
    const buildPath = joinPath(SpecialDirs.Build, relPath(guid));
    return new BuildDAO({
      guid,
      label,
      timestamp: new Date(),
      disk: disk instanceof Disk ? disk : DiskFromJSON(disk),
      workspaceId,
      buildPath,
      logs: [],
    });
  }

  static async FetchFromGuid(guid: string) {
    const result = await ClientDb.builds.where("guid").equals(guid).first();
    if (!result) return result;
    return BuildDAO.FromJSON(result);
  }

  static async all() {
    return (await ClientDb.builds.toArray()).map((build) => BuildDAO.FromJSON(build));
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
    for (const [key, value] of Object.entries(properties)) {
      (this as any)[key] = value;
    }
    await ClientDb.builds.update(this.guid, properties);
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
      const disk = this.Disk;
      await disk.removeMultipleFiles([this.buildPath]);
    } catch (error) {
      console.error(`Failed to remove build files at ${this.buildPath}:`, error);
    }
    //todo delete disk, when i move over to build disks
    // return Promise.all([BuildDAO.delete(this.guid)]);
    return BuildDAO.delete(this.guid);
  }
  static delete(guid: string) {
    return ClientDb.builds.delete(guid);
  }
}

export class NullBuildDAO extends BuildDAO {
  constructor() {
    super({
      guid: "",
      label: "",
      timestamp: new Date(0),
      disk: new NullDisk(),
      workspaceId: "",
      buildPath: absPath("/"),
      logs: [],
    });
  }
}

export const NullBuild = new NullBuildDAO();
