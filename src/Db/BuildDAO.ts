import { BuildRecord } from "@/Db/BuildRecord";
import { DiskDAO } from "@/Db/DiskDAO";
import { ClientDb } from "@/Db/instance";
import { nanoid } from "nanoid";

export type BuildJType = BuildRecord;

export class BuildDAO {
  guid: string;
  label: string;
  timestamp: Date;
  diskId: string;

  static guid = () => "__build__" + nanoid();

  constructor(build: BuildRecord) {
    this.guid = build.guid;
    this.label = build.label;
    this.timestamp = build.timestamp;
    this.diskId = build.diskId;
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
    };
  }

  static CreateNew(label: string, diskId: string) {
    return new BuildDAO({
      guid: BuildDAO.guid(),
      label,
      timestamp: new Date(),
      diskId,
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
    return ClientDb.builds.update(this.guid, properties);
  }

  save() {
    return ClientDb.builds.put({
      guid: this.guid,
      label: this.label,
      timestamp: this.timestamp,
      diskId: this.diskId,
    });
  }

  async delete() {
    return Promise.all([DiskDAO.delete(this.diskId), BuildDAO.delete(this.guid)]);
  }
  static delete(guid: string) {
    return ClientDb.builds.delete(guid);
  }
}
