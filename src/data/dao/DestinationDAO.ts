import { DestinationRecord } from "@/data/dao/DestinationRecord";
import { ClientDb } from "@/data/db/DBInstance";
import { DestinationSchemaTypeMap, DestinationType } from "@/data/DestinationSchemaMap";
import { RemoteAuthJType } from "@/data/RemoteAuthTypes";
import { NotFoundError } from "@/lib/errors/errors";
import { getUniqueSlug, getUniqueSlugAsync } from "@/lib/getUniqueSlug";
import { RandomSlugWords } from "@/lib/randomSlugWords";
import { safeSerializer } from "@/lib/safeSerializer";
import { NULL_REMOTE_AUTH, RemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
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
  destinationUrl?: string | null;
  get provider() {
    return this.remoteAuth?.source || "custom";
  }
  static guid = () => "__dest__" + nanoid();

  constructor({
    guid,
    remoteAuth,
    meta,
    label,
    timestamp,
    destinationUrl,
  }: DestinationRecord<T> & { destinationUrl?: string | null }) {
    this.guid = guid;
    this.remoteAuth = remoteAuth;
    this.meta = meta;
    this.label = label;
    this.timestamp = timestamp;
    this.destinationUrl = destinationUrl;
  }

  static FromJSON<T>(json: Optional<DestinationJType<T>, "timestamp"> | DestinationRecord<T>) {
    return new DestinationDAO<T>({
      ...json,
      destinationUrl: json.destinationUrl ?? null,
      timestamp: json.timestamp ?? Date.now(),
    });
  }

  toJSON() {
    return safeSerializer({
      remoteAuth: this.RemoteAuth.toJSON(),
      guid: this.guid,
      meta: this.meta,
      label: this.label,
      timestamp: this.timestamp,
      destinationUrl: this.destinationUrl,
    });
  }

  get RemoteAuth() {
    if (!this.remoteAuth) {
      return NULL_REMOTE_AUTH;
    }
    return this.remoteAuth instanceof RemoteAuthDAO ? this.remoteAuth : RemoteAuthDAO.FromJSON(this.remoteAuth);

    // : RemoteAuthDAO.FromJSONSafe(this.remoteAuth, this.remoteAuthId);
  }

  static async CreateNew<T>({
    guid = DestinationDAO.guid(),
    remoteAuth,
    meta,
    label,
    timestamp = Date.now(),
    destinationUrl = null,
  }: {
    guid?: string;
    remoteAuth: RemoteAuthDAO | RemoteAuthJType;
    meta: T;
    label: string;
    timestamp?: number;
    destinationUrl?: string | null;
  }) {
    const existingNames = (await DestinationDAO.all()).map((rad) => rad.label);
    const uniq = getUniqueSlug(label, existingNames);
    return new DestinationDAO<T>({ guid, remoteAuth, meta, label: uniq, timestamp, destinationUrl });
  }

  static async CreateOrUpdate<T>({
    guid,
    remoteAuth,
    meta,
    label,
    timestamp = Date.now(),
    destinationUrl = null,
  }: {
    guid?: string;
    remoteAuth: RemoteAuthDAO | RemoteAuthJType;
    meta: T;
    label: string;
    timestamp?: number;
    destinationUrl?: string | null;
  }) {
    if (guid) {
      // Update existing destination - don't make label unique
      const existing = await DestinationDAO.FetchDAOFromGuid(guid, false);
      if (existing) {
        await existing.update({ remoteAuth, meta, label, timestamp, destinationUrl });
        return existing;
      }
    }

    // Create new destination with unique label
    const newDest = await DestinationDAO.CreateNew({ guid, remoteAuth, meta, label, timestamp, destinationUrl });
    await newDest.save();
    return newDest;
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

  static FetchDAOFromGuidSafe(guid: string): DestinationDAO {
    // Create a fallback destination for missing destinations
    return new DestinationDAO({
      guid: guid,
      label: "Missing Destination",
      remoteAuth: {
        guid: "missing",
        source: "custom",
        type: "no-auth",
        name: "Missing Connection",
        data: { endpoint: "", corsProxy: undefined },
        tags: [],
        timestamp: Date.now(),
      },
      meta: {},
      timestamp: Date.now(),
      destinationUrl: null,
    });
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
    return destinations.reverse().map(DestinationDAO.FromJSON);
  }

  async save() {
    return ClientDb.destinations.put({
      remoteAuth: this.RemoteAuth.toJSON(),
      guid: this.guid,
      meta: this.meta,
      label: this.label,
      timestamp: this.timestamp,
      destinationUrl: this.destinationUrl,
    });
  }

  delete() {
    return ClientDb.destinations.delete(this.guid);
  }
  static delete(guid: string) {
    return ClientDb.destinations.delete(guid);
  }
}
export const NULL_DESTINATION = new DestinationDAO({
  guid: "null-destination",
  label: "Null Destination",
  remoteAuth: NULL_REMOTE_AUTH,
  meta: {},
  timestamp: Date.now(),
  destinationUrl: null,
});

export const RandomTag = (tag: string) =>
  `My-${tag}-${RandomSlugWords(1)}-${`${Math.trunc(Math.random() * 100)}`.padStart(3, "0")}`;

// Union type of all possible destination form data
export type AnyDestinationMetaType = {
  [K in DestinationType]: DestinationMetaType<K>;
}[DestinationType];
