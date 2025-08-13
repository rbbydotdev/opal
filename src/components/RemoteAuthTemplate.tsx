import {
  RemoteAuthDataFor,
  RemoteAuthExplicitType,
  RemoteAuthRecord,
  RemoteAuthSource,
  RemoteAuthType,
} from "@/Db/RemoteAuth";
import { NotEnv } from "@/lib/notenv";
import { Github } from "lucide-react";

export type RemoteAuthTemplate<T extends TemplateType = TemplateType> = {
  name: string;
  description: string;
  source: RemoteAuthSource;
  type: RemoteAuthType;
  icon: React.ReactNode;
  templateType: T;
  data?: (RemoteAuthDefaultData[TemplateType] & { data: unknown })["data"];
};
export function template<T extends TemplateType>(
  params: Omit<RemoteAuthTemplate<T>, "templateType">
): RemoteAuthTemplate & { templateType: TemplateType } {
  return { ...params, templateType: typeSource(params) satisfies TemplateType };
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
      apiProxy: NotEnv.GithubApiProxy,
    },
  }),
  template({
    name: "GitHub Device Auth",
    description: "Connect using GitHub Device Authentication",
    source: "github",
    type: "oauth-device",
    icon: <Github className="h-5 w-5" />,
    data: {
      apiProxy: NotEnv.GithubApiProxy, //<---- this should fail
    },
  }),
  template({
    name: "GitHub OAuth",
    description: "Connect using GitHub OAuth",
    source: "github",
    type: "oauth",
    icon: <Github className="h-5 w-5" />,
  }),
];

export type RemoteAuthFormValues = RemoteAuthRecord & {
  templateType: TemplateType;
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
