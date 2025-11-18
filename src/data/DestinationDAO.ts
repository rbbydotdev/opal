import { ClientDb } from "@/data/instance";
import { RemoteAuthDAO } from "@/data/RemoteAuth";
import { RemoteAuthJType, RemoteAuthSource } from "@/data/RemoteAuthTypes";
import { DestinationRecord } from "@/lib/FileTree/DestinationRecord";
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

  static CreateNew<T>({
    remoteAuth,
    meta,
    label,
  }: {
    remoteAuth: RemoteAuthDAO | RemoteAuthJType;
    meta: T;
    label: string;
  }) {
    return new DestinationDAO<T>({ guid: DestinationDAO.guid(), remoteAuth, meta, label, timestamp: new Date() });
  }

  static FetchFromGuid(guid: string) {
    return ClientDb.destinations.where("guid").equals(guid).first();
  }

  update(properties: Partial<DestinationRecord<T>>) {
    return ClientDb.destinations.update(this.guid, properties);
  }

  static async all() {
    const destinations = await ClientDb.destinations.orderBy("timestamp").toArray();
    return destinations.map((destination) => DestinationDAO.FromJSON(destination));
  }

  async save() {
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

const RandomTag = (tag: string) =>
  `My-${tag}-${RandomSlugWords(1)}-${`${Math.trunc(Math.random() * 100)}`.padStart(3, "0")}`;

export const DestinationSchemaMap = {
  cloudflare: z
    .object({
      remoteAuthId: z.string().min(1, "Remote Auth ID is required"),
      label: z.string().min(1, "Label is required"),
      meta: z.object({
        accountId: z.string().min(1, "Account ID is required"),
        siteId: z.string().min(1, "Site ID is required"),
      }),
    })
    .default(() => ({
      remoteAuthId: "",
      label: RandomTag("Cloudflare"),
      meta: { accountId: "", siteId: "" },
    })),
  netlify: z
    .object({
      remoteAuthId: z.string(),
      label: z.string().min(1, "Label is required"),
      meta: z.object({
        // implicit! accountId: z.string(),
        siteName: z.string().min(1, "Site Name is required"),
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
      remoteAuthId: z.string().min(1, "Remote Auth ID is required"),
      label: z.string().min(1, "Label is required"),
      meta: z.object({
        repository: z.string().min(1, "Repository is required"),
        branch: z.string().min(1, "Branch is required"),
      }),
    })
    .default(() => ({
      remoteAuthId: "",
      label: RandomTag("Github"),
      meta: { repository: "", branch: "" },
    })),
  custom: z
    .object({
      remoteAuthId: z.string().default(""),
      label: z.string().default(""),
      meta: z.object({}),
    })
    .default(() => ({
      remoteAuthId: "",
      label: "",
      meta: {
        endpoint: z.string().url().default("https://example.com"),
      },
    })),
} satisfies Record<RemoteAuthSource, z.ZodTypeAny>;

// Unified form schema for destination creation
export const DestinationFormSchema = z
  .object({
    destinationType: z.enum(["cloudflare", "netlify", "github", "none"]),
    remoteAuthId: z.string(),
    label: z.string(),
    meta: z.object({
      // Cloudflare fields
      accountId: z.string().optional(),
      siteId: z.string().optional(),
      // Netlify fields
      siteName: z.string().optional(),
      // GitHub fields
      repository: z.string().optional(),
      branch: z.string().optional(),
    }),
  })
  .refine(
    (data) => {
      // Dynamic validation based on destination type
      if (data.destinationType === "none") return true;

      // Common validations for all non-none types
      if (!data.remoteAuthId || data.remoteAuthId.length === 0) return false;
      if (!data.label || data.label.length === 0) return false;

      // Type-specific validations
      switch (data.destinationType) {
        case "cloudflare":
          return !!(data.meta.accountId && data.meta.siteId);
        case "netlify":
          return !!data.meta.siteName;
        case "github":
          return !!(data.meta.repository && data.meta.branch);
        default:
          return false;
      }
    },
    {
      message: "Please fill in all required fields for the selected destination type",
    }
  );

export type DestinationFormType = z.infer<typeof DestinationFormSchema>;

export type DestinationType = keyof typeof DestinationSchemaMap;

export type DestinationSchemaTypeMap<DestinationType extends keyof typeof DestinationSchemaMap> = z.infer<
  (typeof DestinationSchemaMap)[DestinationType]
>;
// DestinationSchemaTypeMap
