// import { newImagesWorkerInstance } from "@/components/SWImages";
// import { newImagesWorkerInstance } from "@/components/SWImages";

import { ClientDb } from "@/Db/instance";
import { ThumbnailRecord } from "@/Db/ThumbnailRecord";
import { NotFoundError } from "@/lib/errors";
import { absPath, AbsPath, BasePath } from "@/lib/paths";
import { nanoid } from "nanoid";

const THROW = true;
const NO_THROW = false;

export class ThumbnailDAO implements ThumbnailRecord {
  path!: string;
  content!: Uint8Array;
  workspaceId!: string;
  guid!: string;

  static THROW: typeof THROW = THROW;
  static NO_THROW: typeof NO_THROW = NO_THROW;

  protected constructor(record: ThumbnailRecord) {
    Object.assign(this, record);
  }
  static new(workspaceId: string, path: AbsPath, content: Uint8Array = new Uint8Array()): ThumbnailDAO {
    return new ThumbnailDAO({
      guid: nanoid(),
      workspaceId,
      path: String(path),
      content,
    });
  }
  toRecord() {
    const record = new ThumbnailRecord();
    record.guid = this.guid;
    record.path = this.path;
    record.workspaceId = this.workspaceId;
    record.content = this.content;
    return record;
  }

  static allRecords = async () => {
    return ClientDb.thumbnails.toArray();
  };

  static create = async (workspaceId: string, path: AbsPath, content: Uint8Array): Promise<ThumbnailDAO> => {
    const thumbDAO = ThumbnailDAO.new(workspaceId, path, content);
    await thumbDAO.save();
    return thumbDAO;
  };
  save() {
    return ClientDb.thumbnails.put(this.toRecord());
  }

  static update = async (workspaceId: string, path: AbsPath, content: Uint8Array): Promise<ThumbnailDAO> => {
    const record = await this.byPath(workspaceId, path, NO_THROW);
    if (record) {
      record.content = content;
      await ClientDb.thumbnails.update([workspaceId, String(path)], { content });
      return record;
    } else {
      return this.create(workspaceId, path, content);
    }
  };

  update(properties: Omit<Partial<ThumbnailRecord>, "guid">) {
    return ClientDb.thumbnails.update(this.guid, properties);
  }

  static byGuid = async (guid: string): Promise<ThumbnailDAO | null> => {
    const thumbnail = await ClientDb.thumbnails.get(guid);
    if (!thumbnail) {
      return null;
    }
    return new ThumbnailDAO({ ...thumbnail });
  };

  static exists = async (workspaceId: string, path: AbsPath | string): Promise<boolean> => {
    const record = await ClientDb.thumbnails.get([workspaceId, String(path)]);
    return !!record;
  };

  static async byPath(workspaceId: string, path: AbsPath, ifNotFound: typeof THROW): Promise<ThumbnailDAO>;
  static async byPath(workspaceId: string, path: AbsPath, ifNotFound: typeof NO_THROW): Promise<ThumbnailDAO | null>;
  static async byPath(workspaceId: string, path: AbsPath, ifNotFound = THROW): Promise<ThumbnailDAO | null> {
    const thumbnail = await ClientDb.thumbnails.get([workspaceId, String(path)]);
    if (!thumbnail) {
      if (ifNotFound === THROW) throw new NotFoundError("Thumbnail not found");
      return null;
    }
    return new ThumbnailDAO({ ...thumbnail });
  }
  move = async (newPath: AbsPath | string): Promise<void> => {
    await this.update({ path: String(newPath) });
  };

  static move = async (workspaceId: string, oldPath: AbsPath | string, newPath: AbsPath | string): Promise<void> => {
    const record = await ClientDb.thumbnails.get([workspaceId, String(oldPath)]);
    if (record) {
      await ClientDb.thumbnails.update([workspaceId, String(oldPath)], { path: String(newPath) });
    }
  };
  static remove(workspaceId: string, path: AbsPath | string): Promise<void> {
    return ClientDb.thumbnails.delete([workspaceId, String(path)]);
  }
  remove = async (): Promise<void> => {
    await ClientDb.thumbnails.delete([this.workspaceId, this.path]);
  };
  static removeWorkspace = async (workspaceId: string): Promise<void> => {
    await ClientDb.thumbnails.where({ workspaceId }).delete();
  };
}

export class Thumbnail extends ThumbnailDAO {
  // private worker: ReturnType<typeof newImagesWorkerInstance> | undefined;
  static pathToThumbnailPath(path: AbsPath | string, encode: boolean = true) {
    const url = new URL(String(path), "http://localhost");
    url.searchParams.delete("thumb");
    url.searchParams.set("thumb", "1");
    url.pathname = encode ? BasePath.encode(url.pathname) : url.pathname;
    return absPath(url.href.replace(url.origin, ""));
  }
  static thumbnailPathToPath(path: AbsPath | string) {
    const url = new URL(String(path), "http://localhost");
    url.searchParams.delete("thumb");
    return absPath(url.href.replace(url.origin, ""));
  }

  constructor(arg: Partial<ThumbnailRecord>) {
    super(arg as ThumbnailRecord);
    Object.assign(this, arg);
  }
}
