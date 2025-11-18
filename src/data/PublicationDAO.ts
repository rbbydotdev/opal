import { DestinationDAO, DestinationJType } from "@/data/DestinationDAO";
import { nanoid } from "nanoid";

export type PublishLogLine = {
  timestamp: Date;
  message: string;
  type: "info" | "error";
};

export interface PublicationRecord {
  destination: DestinationJType | DestinationDAO;
  timestamp?: number;
  status: "idle" | "success" | "failed";
  logs: PublishLogLine[];
}
export type PublicationJType = ReturnType<typeof PublicationDAO.prototype.toJSON>;
export class PublicationDAO implements PublicationRecord {
  guid: string;
  destination: DestinationJType | DestinationDAO;
  timestamp?: number;
  status: "idle" | "success" | "failed";
  logs: PublishLogLine[];

  static guid = () => "__publication__" + nanoid();

  constructor({ destination, timestamp, status, logs }: Optional<PublicationRecord, "logs" | "timestamp">) {
    this.guid = PublicationDAO.guid();
    this.destination = destination; // instanceof DestinationDAO ? destination : DestinationDAO.FromJSON(destination);
    this.timestamp = timestamp ?? Date.now();
    this.status = status;
    this.logs = logs || [];
  }

  static FromDestination(destination: DestinationDAO | DestinationJType) {
    return new PublicationDAO({
      destination,
      status: "idle",
    });
  }

  get Destination() {
    return this.destination instanceof DestinationDAO ? this.destination : DestinationDAO.FromJSON(this.destination);
  }

  static FromJSON(json: PublicationJType) {
    return new PublicationDAO(json);
  }

  toJSON() {
    return {
      destination: this.Destination.toJSON(),
      timestamp: this.timestamp,
      status: this.status,
      logs: this.logs,
    };
  }
}
