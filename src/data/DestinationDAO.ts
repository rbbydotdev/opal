import { ClientDb } from "@/data/instance";
import { RemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { RemoteAuthJType, RemoteAuthSource } from "@/data/RemoteAuthTypes";
import { NotFoundError } from "@/lib/errors";
import { DestinationRecord } from "@/lib/FileTree/DestinationRecord";
import { getUniqueSlug, getUniqueSlugAsync } from "@/lib/getUniqueSlug";
import { RandomSlugWords } from "@/lib/randomSlugWords";
import { nanoid } from "nanoid";
import z from "zod";

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

  static async Create<T>({
    remoteAuth,
    meta,
    label,
  }: {
    remoteAuth: RemoteAuthDAO | RemoteAuthJType;
    meta: T;
    label: string;
  }) {
    const existingNames = (await DestinationDAO.all()).map((rad) => rad.label);
    const uniq = getUniqueSlug(label, existingNames);
    return new DestinationDAO<T>({ guid: DestinationDAO.guid(), remoteAuth, meta, label: uniq, timestamp: Date.now() });
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

type CloudflareDestinationData = z.infer<(typeof DestinationSchemaMap)["cloudflare"]>["meta"];
export class CloudflareDestination extends DestinationDAO<CloudflareDestinationData> {}

type NetlifyDestinationData = z.infer<(typeof DestinationSchemaMap)["netlify"]>["meta"];
export class NetlifyDestination extends DestinationDAO<NetlifyDestinationData> {}

type AWSDestinationData = z.infer<(typeof DestinationSchemaMap)["aws"]>["meta"];
export class AWSDestination extends DestinationDAO<AWSDestinationData> {}

type GitHubDestinationData = z.infer<(typeof DestinationSchemaMap)["github"]>["meta"];
export class GitHubDestination extends DestinationDAO<GitHubDestinationData> {}

const RandomTag = (tag: string) =>
  `My-${tag}-${RandomSlugWords(1)}-${`${Math.trunc(Math.random() * 100)}`.padStart(3, "0")}`;

export const DestinationSchemaMap = {
  cloudflare: z
    .object({
      remoteAuthId: z.string().trim().min(1, "Remote Auth ID is required"),
      label: z.string().trim().min(1, "Label is required"),
      meta: z.object({
        accountId: z.string().trim().min(1, "Account ID is required"),
        siteId: z.string().trim().min(1, "Site ID is required"),
      }),
    })
    .default(() => ({
      remoteAuthId: "",
      label: RandomTag("Cloudflare"),
      meta: { accountId: "", siteId: "" },
    })),
  vercel: z
    .object({
      remoteAuthId: z.string().trim().min(1, "Remote Auth ID is required"),
      label: z.string().trim().min(1, "Label is required"),
      meta: z.object({
        // implicit! projectId: z.string().trim(),
        // implicit! teamId: z.string().trim().optional(),
      }),
    })
    .default(() => ({
      remoteAuthId: "",
      label: RandomTag("Vercel"),
      meta: {},
    })),
  netlify: z
    .object({
      remoteAuthId: z.string().trim(),
      label: z.string().trim().min(1, "Label is required"),
      meta: z.object({
        // implicit! accountId: z.string().trim(),
        siteName: z.string().trim().min(1, "Site Name is required"),
      }),
    })
    .default(() => ({
      remoteAuthId: "",
      label: RandomTag("Netlify"),
      meta: {
        siteName: "",
      },
    })),
  github: z
    .object({
      remoteAuthId: z.string().trim().min(1, "Remote Auth ID is required"),
      label: z.string().trim().min(1, "Label is required"),
      meta: z.object({
        repository: z.string().trim().min(1, "Repository is required"),
        branch: z.string().trim().min(1, "Branch is required"),
      }),
    })
    .default(() => ({
      remoteAuthId: "",
      label: RandomTag("Github"),
      meta: { repository: "", branch: "gh-pages" },
    })),
  aws: z
    .object({
      remoteAuthId: z.string().trim().min(1, "Remote Auth ID is required"),
      label: z.string().trim().min(1, "Label is required"),
      meta: z.object({
        bucketName: z.string().trim().min(1, "Bucket name is required"),
        region: z.string().trim().min(1, "Region is required"),
      }),
    })
    .default(() => ({
      remoteAuthId: "",
      label: RandomTag("AWS"),
      meta: { bucketName: "", region: "us-east-1" },
    })),
  custom: z
    .object({
      remoteAuthId: z.string().trim().default(""),
      label: z.string().trim().default(""),
      meta: z.object({}),
    })
    .default(() => ({
      remoteAuthId: "",
      label: "",
      meta: {
        endpoint: z.string().trim().url().default("https://example.com"),
      },
    })),
} satisfies Record<RemoteAuthSource, z.ZodTypeAny>;

export type DestinationType = keyof typeof DestinationSchemaMap;

export type DestinationSchemaTypeMap<DestinationType extends keyof typeof DestinationSchemaMap> = z.infer<
  (typeof DestinationSchemaMap)[DestinationType]
>;

// Union type of all possible destination form data
export type AnyDestinationMetaType = {
  [K in DestinationType]: DestinationMetaType<K>;
}[DestinationType];
