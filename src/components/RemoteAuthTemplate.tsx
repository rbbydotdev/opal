import {
  RemoteAuthDataFor,
  RemoteAuthExplicitType,
  RemoteAuthRecord,
  RemoteAuthSource,
  RemoteAuthType,
} from "@/Db/RemoteAuth";
import { Env } from "@/lib/env";
import { Github, KeyIcon } from "lucide-react";

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

export const typeSource = ({ type, source }: { type: RemoteAuthType; source: RemoteAuthSource }): TemplateType =>
  `${type}/${source}` satisfies TemplateType;

export const RemoteAuthTemplates: readonly RemoteAuthTemplate[] = [
  template({
    name: "Basic Auth",
    description: "Connect using Basic Auth",
    source: "private",
    type: "basic-auth",
    icon: <KeyIcon className="h-5 w-5" />,
    data: {
      corsProxy: Env.PrivateCorsProxy,
    },
  }),
  template({
    name: "GitHub API",
    description: "Connect using a GitHub API key",
    source: "github",
    type: "api",
    icon: <Github className="h-5 w-5" />,
    data: {
      corsProxy: Env.GithubCorsProxy,
    },
  }),
  template({
    name: "GitHub Device Auth",
    description: "Connect using GitHub Device Authentication",
    source: "github",
    type: "oauth-device",
    icon: <Github className="h-5 w-5" />,
    data: {
      corsProxy: Env.GithubCorsProxy,
    },
  }),
  template({
    name: "GitHub OAuth",
    description: "Connect using GitHub OAuth",
    source: "github",
    type: "oauth",
    icon: <Github className="h-5 w-5" />,
    data: {
      corsProxy: Env.GithubCorsProxy,
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
> = `${T}/${U}`;

export type RemoteAuthDefaultData = Partial<{
  [T in RemoteAuthExplicitType["type"] as `${T}/${string}`]: {
    data: Partial<RemoteAuthDataFor<T>>;
  };
}>;
