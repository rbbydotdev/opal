import { DestinationSchemaTypeMap, DestinationType } from "@/data/DestinationSchemaMap";
import { ClientDb } from "@/data/instance";
import { RemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { RemoteAuthJType } from "@/data/RemoteAuthTypes";
import { NotFoundError } from "@/lib/errors";
import { DestinationRecord } from "@/lib/FileTree/DestinationRecord";
import { getUniqueSlug, getUniqueSlugAsync } from "@/lib/getUniqueSlug";
import { RandomSlugWords } from "@/lib/randomSlugWords";
import { nanoid } from "nanoid";

export type DestinationJType<T = unknown> = ReturnType<DestinationDAO<T>["toJSON"]>;

type DestinationData<T> = T;

export type DestinationMetaType<T extends DestinationType> = T extends DestinationType
  ? DestinationSchemaTypeMap<T>
  : never;

export class DestinationDAO<T = unknown> implements DestinationRecord<T> {
  guid: string;
  label: string;
  remoteAuth: RemoteAuthDAO | RemoteAuthJType;
  meta: DestinationData<T>;
  timestamp?: number;
  static guid = () => "__dest__" + nanoid();

  constructor({ guid, remoteAuth, meta, label, timestamp }: DestinationRecord<T>) {
    this.guid = guid;
    this.remoteAuth = remoteAuth;
    this.meta = meta;
    this.label = label;
    this.timestamp = timestamp;
  }

  static FromJSON<T>(json: Optional<DestinationJType<T>, "timestamp">) {
    return new DestinationDAO<T>(json);
  }

  toJSON() {
    return {
      remoteAuth: this.RemoteAuth.toJSON(),
      guid: this.guid,
      meta: this.meta,
      label: this.label,
      timestamp: this.timestamp,
    };
  }

  get RemoteAuth() {
    return this.remoteAuth instanceof RemoteAuthDAO ? this.remoteAuth : RemoteAuthDAO.FromJSON(this.remoteAuth);
  }

  static async CreateNew<T>({
    guid = DestinationDAO.guid(),
    remoteAuth,
    meta,
    label,
    timestamp = Date.now(),
  }: {
    guid?: string;
    remoteAuth: RemoteAuthDAO | RemoteAuthJType;
    meta: T;
    label: string;
    timestamp?: number;
  }) {
    const existingNames = (await DestinationDAO.all()).map((rad) => rad.label);
    const uniq = getUniqueSlug(label, existingNames);
    return new DestinationDAO<T>({ guid, remoteAuth, meta, label: uniq, timestamp });
  }

  static FetchFromGuid(guid: string) {
    return ClientDb.destinations.where("guid").equals(guid).first();
  }
  static async FetchDAOFromGuid(guid: string, throwNotFound: false): Promise<DestinationDAO<any> | null>;
  static async FetchDAOFromGuid(guid: string, throwNotFound: true): Promise<DestinationDAO<any>>;
  static async FetchDAOFromGuid(guid: string, throwNotFound = false) {
    const dest = await ClientDb.destinations.where("guid").equals(guid).first();
    if (throwNotFound && !dest) {
      throw new NotFoundError("Destination not found");
    }
    return dest ? DestinationDAO.FromJSON(dest) : null;
  }

  hydrate = async () => {
    const result = await DestinationDAO.FetchFromGuid(this.guid);
    if (result) {
      Object.assign(this, result);
    }
  };
  async update(properties: Partial<Omit<DestinationRecord<T>, "guid">>) {
    await ClientDb.destinations.update(this.guid, properties);
    return this.hydrate();
  }

  static FindUniqueLabel(name: string) {
    return getUniqueSlugAsync(name, async (candidate) => {
      const existing = await ClientDb.destinations.where("label").equals(candidate).first();
      return !!existing;
    });
  }

  static async all() {
    const destinations = await ClientDb.destinations.orderBy("timestamp").toArray();
    return destinations.map((destination) => DestinationDAO.FromJSON(destination));
  }

  async save() {
    // console.log({
    //   remoteAuth: this.RemoteAuth.toJSON(),
    //   guid: this.guid,
    //   meta: this.meta,
    //   label: this.label,
    //   timestamp: this.timestamp,
    // });
    return ClientDb.destinations.put({
      remoteAuth: this.RemoteAuth.toJSON(),
      guid: this.guid,
      meta: this.meta,
      label: this.label,
      timestamp: this.timestamp,
    });
  }

  delete() {
    return ClientDb.destinations.delete(this.guid);
  }
  static delete(guid: string) {
    return ClientDb.destinations.delete(guid);
  }
}

export const RandomTag = (tag: string) =>
  `My-${tag}-${RandomSlugWords(1)}-${`${Math.trunc(Math.random() * 100)}`.padStart(3, "0")}`;

// Union type of all possible destination form data
export type AnyDestinationMetaType = {
  [K in DestinationType]: DestinationMetaType<K>;
}[DestinationType];
