import { Channel } from "@/lib/channel";
import { AbsPath, RelPath, absPath, relPath } from "@/lib/paths2";
import { CreateSuperTypedEmitterClass } from "@/lib/TypeEmitter";

export type RemoteRenameFileType = {
  oldPath: AbsPath;
  oldName: RelPath;
  newPath: AbsPath;
  newName: RelPath;
  fileType: "file" | "dir";
};

export type FilePathsType = {
  filePaths: AbsPath[];
};

export type CreateDetails = FilePathsType;
export type DeleteDetails = FilePathsType;
export type RenameDetails = RemoteRenameFileType;

export class RenameFileType {
  oldPath: AbsPath;
  oldName: RelPath;
  newPath: AbsPath;
  newName: RelPath;
  fileType: "file" | "dir";

  constructor({
    oldPath,
    oldName,
    newPath,
    newName,
    fileType,
  }: {
    oldPath: string | AbsPath;
    oldName: string | RelPath;
    newPath: string | AbsPath;
    newName: string | RelPath;
    fileType: "file" | "dir";
  }) {
    this.oldPath = typeof oldPath === "string" ? absPath(oldPath) : oldPath;
    this.oldName = typeof oldName === "string" ? relPath(oldName) : oldName;
    this.newPath = typeof newPath === "string" ? absPath(newPath) : newPath;
    this.newName = typeof newName === "string" ? relPath(newName) : newName;
    this.fileType = fileType;
  }
  toJSON() {
    return {
      oldPath: this.oldPath,
      oldName: this.oldName,
      newPath: this.newPath,
      newName: this.newName,
      fileType: this.fileType,
    };
  }
  static New(properties: RemoteRenameFileType): RenameFileType {
    return new RenameFileType(properties);
  }
}

export type IndexTrigger =
  | {
      type: "create";
      details: CreateDetails;
    }
  | {
      type: "rename";
      details: RenameDetails[];
    }
  | {
      type: "delete";
      details: DeleteDetails;
    };

export type ListenerCallback<T extends "create" | "rename" | "delete"> = T extends "create"
  ? (props: CreateDetails) => void
  : T extends "rename"
    ? (props: RenameDetails[]) => void
    : T extends "delete"
      ? (props: DeleteDetails) => void
      : never;

export type DiskRemoteEventPayload = {
  // [DiskEvents.RENAME]: RemoteRenameFileType[];
  [DiskEvents.INDEX]: IndexTrigger | undefined;
  //for remotes or 'processes'(img node src replace on file move etc)
  //that write 'outside' not intended for local writes done via the editor
  //may be used to indicate to the editor to update
  [DiskEvents.OUTSIDE_WRITE]: FilePathsType;
  //intended for hot writes, when the editor is writing to disk
  //therefore inside writes should never do anything which impacts the editor
  [DiskEvents.INSIDE_WRITE]: FilePathsType;
};

export function isFilePathsPayload(
  payload: DiskRemoteEventPayload[keyof DiskRemoteEventPayload]
): payload is FilePathsType {
  return typeof payload === "object" && payload !== null && "filePaths" in payload;
}

export class DiskEventsRemote extends Channel<DiskRemoteEventPayload> {}

export const SIGNAL_ONLY = undefined;
export const DiskEvents = {
  INSIDE_WRITE: "inside-write" as const, //for writes done by the editor or local process

  //outside write will return contents for the watched file
  OUTSIDE_WRITE: "outside-write" as const,
  //outside update will return filepath only, not contents, "*" is possible
  // OUTSIDE_UPDATE: "outside-update" as const,
  INDEX: "index" as const,
  RENAME: "rename" as const,
  CREATE: "create" as const,
  DELETE: "delete" as const,
};
export type DiskLocalEventPayload = {
  [DiskEvents.INDEX]: IndexTrigger | undefined;
  [DiskEvents.OUTSIDE_WRITE]: FilePathsType;
  [DiskEvents.INSIDE_WRITE]: FilePathsType;
};
export class DiskEventsLocal extends CreateSuperTypedEmitterClass<
  DiskLocalEventPayload,
  {
    diskId: string;
  }
>() {
  constructor(private diskId: string) {
    super();
  }
  emit(event: keyof DiskLocalEventPayload, payload: DiskLocalEventPayload[typeof event] = {} as any) {
    return super.emit(event, { ...payload, diskId: this["diskId"] });
  }
}
