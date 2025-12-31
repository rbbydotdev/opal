import { BuildRecord, BuildStrategy } from "@/data/dao/BuildRecord";
import { PublicationDAO, PublicationJType } from "@/data/dao/PublicationDAO";
import { ClientDb } from "@/data/db/DBInstance";
import { Disk } from "@/data/disk/Disk";
import { DiskFromJSON } from "@/data/disk/DiskFactory";
import { DiskJType } from "@/data/disk/DiskType";
import { NullDisk } from "@/data/disk/NullDisk";
import { SpecialDirs } from "@/data/SpecialDirs";
import { NotFoundError } from "@/lib/errors/errors";
import { absPath, AbsPath, joinPath, relPath } from "@/lib/paths2";
import { safeSerializer } from "@/lib/safeSerializer";
import { downloadBuildZipURL } from "@/lib/service-worker/downloadZipURL";
import { LogLine } from "@/types/RunnerTypes";
import { nanoid } from "nanoid";

type BuildJType = ReturnType<typeof BuildDAO.prototype.toJSON>;

export const BuildPath = (buildId: string) => joinPath(SpecialDirs.Build, relPath(buildId));

export class BuildDAO implements BuildRecord {
  isNull: Boolean = false;
  guid: string;
  disk: Disk | DiskJType;
  sourceDisk: Disk | DiskJType;
  sourcePath: AbsPath;
  strategy: BuildStrategy;
  label: string;
  fileCount: number;
  timestamp: number;
  status: "success" | "error" | "pending" | "idle" = "idle";
  error: string | null = null;
  workspaceId: string;
  buildPath: AbsPath;
  logs: LogLine[];
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
    error = null,
  }: Optional<BuildRecord, "status" | "error">) {
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
    this.error = error;
    this.logs = logs;
  }

  static FromJSON(json: BuildJType) {
    return new BuildDAO(json);
  }

  toJSON() {
    return safeSerializer({
      buildPath: this.buildPath,
      disk: this.disk,
      error: this.error,
      fileCount: this.fileCount,
      guid: this.guid,
      label: this.label,
      logs: this.logs,
      sourceDisk: this.sourceDisk,
      sourcePath: this.sourcePath,
      status: this.status,
      strategy: this.strategy,
      timestamp: this.timestamp,
      workspaceId: this.workspaceId,
    });
  }

  complete() {
    this.status === "success";
    return this.save();
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
    logs?: LogLine[];
  }) {
    const buildPath = BuildPath(guid);
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

  static async FetchDAOFromGuid(guid: string, throwNotFound: false): Promise<BuildDAO | null>;
  static async FetchDAOFromGuid(guid: string, throwNotFound: true): Promise<BuildDAO>;
  static async FetchDAOFromGuid(guid: string, throwNotFound = false) {
    const build = await ClientDb.builds.where("guid").equals(guid).first();
    if (throwNotFound && !build) {
      throw new NotFoundError("Build not found");
    }
    return build ? BuildDAO.FromJSON(build) : null;
  }

  static FetchDAOFromGuidSafe(guid: string): BuildDAO {
    // Create a fallback build for missing builds
    return new BuildDAO({
      guid: guid,
      label: "Missing Build",
      timestamp: Date.now(),
      fileCount: 0,
      disk: new NullDisk(),
      sourceDisk: new NullDisk(),
      sourcePath: absPath("/"),
      strategy: "freeform",
      status: "error",
      workspaceId: "",
      buildPath: absPath("/"),
      logs: [],
    });
  }

  static async FetchFromGuid(guid: string) {
    const result = await ClientDb.builds.where("guid").equals(guid).first();
    if (!result) return result;
    return BuildDAO.FromJSON(result);
  }

  static async all() {
    return (await ClientDb.builds.orderBy("timestamp").toArray()).reverse().map(BuildDAO.FromJSON);
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

  async update(properties: Partial<Omit<BuildRecord, "guid">>) {
    Object.assign(this, properties);
    await ClientDb.builds.update(this.guid, this.toJSON());
    return this.hydrate();
  }

  save() {
    return ClientDb.builds.put(this.toJSON());
  }

  get completed() {
    return this.status !== "pending";
  }

  getBuildPath(): AbsPath {
    return this.buildPath;
  }

  get Disk() {
    return (this.disk = this.disk instanceof Disk ? this.disk : DiskFromJSON(this.disk));
  }

  getSourceDisk = (): Disk => {
    return this.sourceDisk instanceof Disk ? this.sourceDisk : DiskFromJSON(this.sourceDisk);
  };

  getOutputPath = (): AbsPath => {
    return this.getBuildPath();
  };

  getDownloadBuildZipURL(workspaceName: string): string {
    return downloadBuildZipURL(workspaceName, this.disk.guid, this.buildPath);
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
  isNull = true;
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
