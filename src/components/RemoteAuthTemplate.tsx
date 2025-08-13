import {
  RemoteAuthDataFor,
  RemoteAuthExplicitType,
  RemoteAuthRecord,
  RemoteAuthSource,
  RemoteAuthType,
} from "@/Db/RemoteAuth";
import { NotEnv } from "@/lib/notenv";
import { Github } from "lucide-react";

export type RemoteAuthTemplate<T extends RemoteAuthType = RemoteAuthType> = {
  name: string;
  description: string;
  source: RemoteAuthSource;
  type: T;
  icon: React.ReactNode;
  templateType: `${T}/${RemoteAuthSource}`;
  data?: Partial<Extract<RemoteAuthExplicitType, { type: T }>["data"]>;
};
export function template<T extends RemoteAuthType>(
  params: Omit<RemoteAuthTemplate<T>, "templateType">
): RemoteAuthTemplate<T> {
  return { ...params, templateType: typeSource(params) as `${T}/${RemoteAuthSource}` };
}
export const typeSlug = ({ type, source }: { type: RemoteAuthType; source: RemoteAuthSource }) =>
  `${type}-${source}-connection`.toLowerCase().replace(/\s+/g, "-");

export const typeSource = ({ type, source }: { type: RemoteAuthType; source: RemoteAuthSource }): TemplateType =>
  `${type}/${source}` satisfies TemplateType;

export const RemoteAuthTemplates: readonly RemoteAuthTemplate[] = [
  template({
    name: "GitHub API",
    description: "Connect using a GitHub API key",
    source: "github",
    type: "api",
    icon: <Github className="h-5 w-5" />,
    data: {
      corsProxy: NotEnv.GithubCorsProxy,
    },
  }),
  template({
    name: "GitHub Device Auth",
    description: "Connect using GitHub Device Authentication",
    source: "github",
    type: "oauth-device",
    icon: <Github className="h-5 w-5" />,
    data: {
      corsProxy: NotEnv.GithubCorsProxy,
    },
  }),
  template({
    name: "GitHub OAuth",
    description: "Connect using GitHub OAuth",
    source: "github",
    type: "oauth",
    icon: <Github className="h-5 w-5" />,
    data: {
      corsProxy: NotEnv.GithubCorsProxy,
    },
  }),
];

export type RemoteAuthFormValues<T extends RemoteAuthType = RemoteAuthType> = RemoteAuthRecord & {
  templateType: TemplateType<T>;
  type: T;
};
export type TemplateType<
  T extends RemoteAuthType = RemoteAuthType,
  U extends RemoteAuthSource = RemoteAuthSource,
> = `${RemoteAuthType}/${RemoteAuthSource}`;

export type RemoteAuthDefaultData = Partial<{
  [T in RemoteAuthExplicitType["type"] as `${T}/${string}`]: {
    data: Partial<RemoteAuthDataFor<T>>;
  };
}>;

// const getTypeSource = (value: `${RemoteAuthType}/${RemoteAuthSource}` | string) => {
//   return value.split("/") as [RemoteAuthType, RemoteAuthSource];
// };
// RemoteAuthExplicitType
// export type ExtractTemplateParams<T extends string> = T extends `${infer AuthType}/${infer AuthSource}`
//   ? AuthType extends RemoteAuthType
//     ? AuthSource extends RemoteAuthSource
//       ? [AuthType, AuthSource]
//       : never
//     : never
//   : never;
