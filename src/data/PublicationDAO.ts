import { RemoteAuthDAO } from "@/data/RemoteAuth";
import { RemoteAuthJType } from "@/data/RemoteAuthTypes";
import { nanoid } from "nanoid";

export type PublishLogLine = {
  timestamp: Date;
  message: string;
  type: "info" | "error";
};

export interface PublicationRecord {
  remoteAuth: RemoteAuthJType | RemoteAuthDAO;
  timestamp: Date;
  status: "success" | "failed";
  logs: PublishLogLine[];
}
export type PublicationJType = ReturnType<typeof PublicationDAO.prototype.toJSON>;
export class PublicationDAO implements PublicationRecord {
  guid: string;
  remoteAuth: RemoteAuthDAO | RemoteAuthJType;
  timestamp: Date;
  status: "success" | "failed";
  logs: PublishLogLine[];

  static guid = () => "__publication__" + nanoid();

  constructor({ remoteAuth, timestamp, status, logs }: Optional<PublicationRecord, "logs">) {
    this.guid = PublicationDAO.guid();
    this.remoteAuth = remoteAuth instanceof RemoteAuthDAO ? remoteAuth : RemoteAuthDAO.FromJSON(remoteAuth);
    this.timestamp = timestamp;
    this.status = status;
    this.logs = logs || [];
  }

  get RemoteAuth() {
    return this.remoteAuth instanceof RemoteAuthDAO ? this.remoteAuth : RemoteAuthDAO.FromJSON(this.remoteAuth);
  }

  static FromJSON(json: PublicationJType) {
    return new PublicationDAO(json);
  }

  toJSON() {
    return {
      remoteAuth: this.RemoteAuth.toJSON(),
      timestamp: this.timestamp,
      status: this.status,
      // logs: this.logs,
    };
  }
}
