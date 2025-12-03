import { PublicationDAO, PublicationJType } from "@/data/DAO/PublicationDAO";
import { BuildLogLine, BuildRecord, BuildStrategy } from "@/data/DAO/records/BuildRecord";
import { Disk } from "@/data/disk/Disk";
import { DiskFromJSON } from "@/data/disk/DiskFactory";
import { DiskJType } from "@/data/disk/DiskType";
import { NullDisk } from "@/data/disk/NullDisk";
import { ClientDb } from "@/data/instance";
import { SpecialDirs } from "@/data/SpecialDirs";
import { absPath, AbsPath, joinPath, relPath } from "@/lib/paths2";
import { nanoid } from "nanoid";

type BuildJType = ReturnType<typeof BuildDAO.prototype.toJSON>;

export class BuildDAO implements BuildRecord {
  guid: string;
  disk: Disk | DiskJType;
  sourceDisk: Disk | DiskJType;
  sourcePath: AbsPath;
  strategy: BuildStrategy;
  label: string;
  fileCount: number;
  timestamp: number;
  status: "idle" | "pending" | "success" | "failed" | "cancelled";
  workspaceId: string;
  buildPath: AbsPath;
  logs: BuildLogLine[];
  publications: (PublicationJType | PublicationDAO)[] = [];

  static guid = () => "build_id_" + nanoid();

  constructor({
    guid,
    label,
    timestamp,
    fileCount,
    disk,
    sourceDisk,
    sourcePath,
    strategy,
    status = "idle",
    workspaceId,
    buildPath,
    logs,
  }: Optional<BuildRecord, "status">) {
    this.guid = guid;
    this.label = label;
    this.timestamp = timestamp;
    this.fileCount = fileCount;
    this.disk = disk;
    this.sourceDisk = sourceDisk;
    this.sourcePath = sourcePath;
    this.strategy = strategy;
    this.workspaceId = workspaceId;
    this.buildPath = buildPath;
    this.status = status;
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
      sourceDisk: this.sourceDisk,
      sourcePath: this.sourcePath,
      strategy: this.strategy,
      workspaceId: this.workspaceId,
      buildPath: this.buildPath,
      logs: this.logs,
      fileCount: this.fileCount,
    };
  }

  static CreateNew({
    label,
    disk,
    sourceDisk,
    sourcePath = absPath("/"),
    strategy,
    workspaceId,
    guid = BuildDAO.guid(),
    fileCount = 0,
    logs = [],
  }: {
    label: string;
    disk: Disk | DiskJType;
    sourceDisk: Disk | DiskJType;
    sourcePath?: AbsPath;
    strategy: BuildStrategy;
    workspaceId: string;
    guid?: string;
    fileCount?: number;
    logs: BuildLogLine[];
  }) {
    const buildPath = joinPath(SpecialDirs.Build, relPath(guid));
    return new BuildDAO({
      guid,
      label,
      timestamp: Date.now(),
      disk: disk instanceof Disk ? disk : DiskFromJSON(disk),
      sourceDisk: sourceDisk instanceof Disk ? sourceDisk : DiskFromJSON(sourceDisk),
      sourcePath,
      strategy,
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
    if (build) Object.assign(this, build);
    return this;
  }

  async update({ ...properties }: Partial<Omit<BuildRecord, "guid">>) {
    await ClientDb.builds.update(this.guid, properties);
    return this.hydrate();
  }

  save() {
    return ClientDb.builds.put({
      guid: this.guid,
      label: this.label,
      timestamp: this.timestamp,
      workspaceId: this.workspaceId,
      disk: this.disk instanceof Disk ? (this.disk.toJSON() as DiskJType) : this.disk,
      sourceDisk: this.sourceDisk instanceof Disk ? (this.sourceDisk.toJSON() as DiskJType) : this.sourceDisk,
      sourcePath: this.sourcePath,
      strategy: this.strategy,
      buildPath: this.buildPath,
      logs: this.logs,
      status: this.status,
      fileCount: this.fileCount,
    });
  }

  get completed() {
    return this.status === "success" || this.status === "failed" || this.status === "cancelled";
  }

  getBuildPath(): AbsPath {
    return this.buildPath;
  }

  get Disk() {
    return (this.disk = this.disk instanceof Disk ? this.disk : DiskFromJSON(this.disk));
  }

  getSourceDisk(): Disk {
    return this.sourceDisk instanceof Disk ? this.sourceDisk : DiskFromJSON(this.sourceDisk);
  }

  getOutputPath(): AbsPath {
    return this.getBuildPath();
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

class NullBuildDAO extends BuildDAO {
  constructor() {
    super({
      guid: "_null_build_",
      label: "NullBuild",
      timestamp: Date.now(),
      disk: new NullDisk().toJSON(),
      sourceDisk: new NullDisk().toJSON(),
      sourcePath: absPath("/"),
      strategy: "freeform",
      workspaceId: "",
      buildPath: absPath("/"),
      logs: [],
      fileCount: 0,
    });
  }
}

export const NULL_BUILD = new NullBuildDAO();
