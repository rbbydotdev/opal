import { ClientDb } from "@/data/instance";
import { DestinationRecord } from "@/lib/FileTree/DestinationRecord";
import { nanoid } from "nanoid";

type DestinationJType = ReturnType<DestinationDAO["toJSON"]>;

export class DestinationDAO {
  guid: string;
  static guid = () => "__dest__" + nanoid();

  constructor(destination: DestinationRecord) {
    this.guid = destination.guid;
  }

  static FromJSON(json: DestinationJType) {
    return new DestinationDAO(json);
  }

  toJSON() {
    return {
      guid: this.guid,
    };
  }

  static CreateNew() {
    return new DestinationDAO({ guid: DestinationDAO.guid() });
  }

  static New(guid: string) {
    return new DestinationDAO({ guid });
  }

  static FetchFromGuid(guid: string) {
    return ClientDb.destinations.where("guid").equals(guid).first();
  }

  update(properties: Partial<DestinationRecord>) {
    return ClientDb.destinations.update(this.guid, properties);
  }

  static async all() {
    const destinations = await ClientDb.destinations.toArray();
    return destinations.map((destination) => DestinationDAO.FromJSON(destination));
  }

  save() {
    return ClientDb.destinations.put({
      guid: this.guid,
    });
  }

  delete() {
    return ClientDb.destinations.delete(this.guid);
  }
  static delete(guid: string) {
    return ClientDb.destinations.delete(guid);
  }
}
