import { DestinationDAO, DestinationJType } from "@/data/dao/DestinationDAO";
import { nanoid } from "nanoid";

type PublishLogLine = {
  timestamp: number;
  message: string;
  type: "info" | "error";
};

interface PublicationRecord {
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
    this.timestamp = timestamp;
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
