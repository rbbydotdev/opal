import { nanoid } from "nanoid";

export type PublishLogLine = {
  timestamp: Date;
  message: string;
  type: "info" | "error";
};

export interface PublicationRecord {
  remoteAuthId: string;
  timestamp: Date;
  status: "success" | "failed";
  logs: PublishLogLine[];
}
export type PublicationJType = ReturnType<typeof PublicationDAO.prototype.toJSON>;
export class PublicationDAO implements PublicationRecord {
  guid: string;
  remoteAuthId: string;
  timestamp: Date;
  status: "success" | "failed";
  logs: PublishLogLine[];

  static guid = () => "__publication__" + nanoid();

  constructor(publication: PublicationRecord) {
    this.guid = PublicationDAO.guid();
    this.remoteAuthId = publication.remoteAuthId;
    this.timestamp = publication.timestamp;
    this.status = publication.status;
    this.logs = publication.logs;
  }

  static FromJSON(json: PublicationJType) {
    return new PublicationDAO(json);
  }

  toJSON() {
    return {
      remoteAuthId: this.remoteAuthId,
      timestamp: this.timestamp,
      status: this.status,
      logs: this.logs,
    };
  }
}
