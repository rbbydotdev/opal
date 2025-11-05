import { BuildLogLine, BuildRecord } from "@/data/BuildRecord";
import { DiskDAO } from "@/data/disk/DiskDAO";
import { DiskFromJSON } from "@/data/disk/DiskFactory";
import { ClientDb } from "@/data/instance";
import { SpecialDirs } from "@/data/SpecialDirs";
import { AbsPath, encodePath, joinPath, relPath } from "@/lib/paths2";
import { nanoid } from "nanoid";

export type BuildJType = BuildRecord;

export class BuildDAO {
  guid: string;
  label: string;
  timestamp: Date;
  diskId: string;
  buildPath: AbsPath;
  logs: BuildLogLine[] = [];

  static guid = () => "build_id_" + nanoid();

  constructor(build: BuildRecord) {
    this.guid = build.guid;
    this.label = build.label;
    this.timestamp = build.timestamp;
    this.diskId = build.diskId;
    this.buildPath = build.buildPath;
  }

  static FromJSON(json: BuildJType) {
    return new BuildDAO(json);
  }

  toJSON(): BuildJType {
    return {
      guid: this.guid,
      label: this.label,
      timestamp: this.timestamp,
      diskId: this.diskId,
      buildPath: this.buildPath,
      logs: this.logs,
    };
  }

  static CreateNew(label: string, diskId: string, guid: string = BuildDAO.guid()) {
    const buildPath = joinPath(SpecialDirs.Build, relPath(guid));
    return new BuildDAO({
      guid,
      label,
      timestamp: new Date(),
      diskId,
      buildPath,
      logs: [],
    });
  }

  static FetchFromGuid(guid: string) {
    return ClientDb.builds.where("guid").equals(guid).first();
  }

  static async all() {
    const builds = await ClientDb.builds.orderBy("timestamp").reverse().toArray();
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

  update(properties: Partial<BuildRecord>) {
    this.label = properties.label ?? this.label;
    this.timestamp = properties.timestamp ?? this.timestamp;
    this.diskId = properties.diskId ?? this.diskId;
    this.buildPath = properties.buildPath ?? this.buildPath;
    return ClientDb.builds.update(this.guid, properties);
  }

  save() {
    return ClientDb.builds.put({
      guid: this.guid,
      label: this.label,
      timestamp: this.timestamp,
      diskId: this.diskId,
      buildPath: this.buildPath,
      logs: this.logs,
    });
  }

  getBuildPath(): AbsPath {
    return this.buildPath;
  }

  async getDisk() {
    const diskDao = await DiskDAO.FetchFromGuid(this.diskId);
    if (!diskDao) return null;
    return DiskFromJSON(diskDao);
  }

  async delete() {
    console.log(`BuildDAO.delete() called for build ${this.guid}`);
    console.log(`Build path: ${this.buildPath}`);
    console.log(`Disk ID: ${this.diskId}`);

    const disk = await this.getDisk();
    console.log(`Retrieved disk:`, disk ? "Found" : "Not found");

    if (disk) {
      try {
        console.log(`Attempting to remove directory: ${encodePath(this.buildPath)}`);
        // await disk.remove(encodePath(this.buildPath), { recursive: true });
        await disk.removeFile(this.buildPath);
        console.log(`Successfully removed build directory: ${this.buildPath}`);
      } catch (error) {
        console.error(`Failed to remove build files at ${this.buildPath}:`, error);
      }
    } else {
      console.warn(`No disk found for diskId: ${this.diskId}`);
    }

    console.log(`Deleting database records for build ${this.guid} and disk ${this.diskId}`);
    return Promise.all([DiskDAO.delete(this.diskId), BuildDAO.delete(this.guid)]);
  }
  static delete(guid: string) {
    return ClientDb.builds.delete(guid);
  }
}
