import { RemoteAuthSourceIconComponent } from "@/components/remote-auth/RemoteAuthSourceIcon";
import { RemoteAuthDataFor, RemoteAuthSource, RemoteAuthType } from "@/data/RemoteAuthTypes";
import { ENV } from "@/lib/env";

// Use distributive conditional type to create proper union
type RemoteAuthTemplate<T extends RemoteAuthType = RemoteAuthType> = T extends any
  ? RemoteAuthSource extends any
    ? {
        name: string;
        description: string;
        source: RemoteAuthSource;
        type: T;
        icon: React.ReactNode;
        templateType: `${T}/${RemoteAuthSource}`;
        data?: Partial<RemoteAuthDataFor<T>>;
      }
    : never
  : never;
export function template<T extends RemoteAuthType>(
  params: Omit<RemoteAuthTemplate<T>, "templateType">
): RemoteAuthTemplate<T> {
  return { ...params, templateType: typeSource(params) } as RemoteAuthTemplate<T>;
}

export const typeSource = ({ type, source }: { type: RemoteAuthType; source: RemoteAuthSource }): TemplateType =>
  `${type}/${source}` satisfies TemplateType;

export const RemoteAuthTemplates: readonly RemoteAuthTemplate[] = [
  template({
    name: "GitHub API",
    description: "Connect using a GitHub API key",
    source: "github",
    type: "api",
    icon: <RemoteAuthSourceIconComponent source="github" />,
    data: {
      corsProxy: ENV.GITHUB_CORS_PROXY,
    },
  }),
  template({
    name: "GitHub Device Auth",
    description: "Connect using GitHub Device Authentication",
    source: "github",
    type: "oauth-device",
    icon: <RemoteAuthSourceIconComponent source="github" />,
    data: {
      corsProxy: ENV.GITHUB_CORS_PROXY,
    },
  }),
  template({
    name: "GitHub OAuth",
    description: "Connect using GitHub OAuth",
    source: "github",
    type: "oauth",
    icon: <RemoteAuthSourceIconComponent source="github" />,
    data: {
      corsProxy: ENV.GITHUB_CORS_PROXY,
    },
  }),

  template({
    name: "Cloudflare API",
    description: "Connect using a Cloudflare API key",
    source: "cloudflare",
    type: "api",
    icon: <RemoteAuthSourceIconComponent source="cloudflare" />,
    data: {
      corsProxy: ENV.CLOUDFLARE_CORS_PROXY,
    },
  }),
  template({
    name: "Vercel API",
    description: "Connect using a Vercel API token",
    source: "vercel",
    type: "api",
    icon: <RemoteAuthSourceIconComponent source="vercel" />,
    data: {
      corsProxy: ENV.VERCEL_CORS_PROXY,
    },
  }),
  /*
  
  Vercel OAuth cannot read or create projects and deployments
  template({
    name: "Vercel OAuth",
    description: "Connect using Vercel OAuth",
    source: "vercel",
    type: "oauth",
    icon: <RemoteAuthSourceIconComponent source="vercel" />,
    data: {
      corsProxy: ENV.VERCEL_CORS_PROXY,
    },
  }),
  */
  template({
    name: "AWS S3 API",
    description: "Connect using AWS Access Key and Secret",
    source: "aws",
    type: "api",
    icon: <RemoteAuthSourceIconComponent source="aws" />,
    data: {
      corsProxy: ENV.AWS_CORS_PROXY,
    },
  }),
  template({
    name: "Netlify API",
    description: "Connect using a Netlify API key",
    source: "netlify",
    type: "api",
    icon: <RemoteAuthSourceIconComponent source="netlify" />,
    data: {
      corsProxy: ENV.NETLIFY_CORS_PROXY,
    },
  }),
  template({
    name: "Netlify OAuth",
    description: "Connect using Netlify OAuth",
    source: "netlify",
    type: "oauth",
    icon: <RemoteAuthSourceIconComponent source="netlify" />,
    data: {
      corsProxy: ENV.NETLIFY_CORS_PROXY,
    },
  }),
  // template({
  //   name: "Basic Auth",
  //   description: "Connect using Basic Auth",
  //   source: "custom",
  //   type: "basic-auth",
  //   icon: <KeyIcon className="h-5 w-5" />,
  //   data: {
  //     corsProxy: ENV.PRIVATE_CORS_PROXY,
  //   },
  // }),

  // template({
  //   name: "No Auth",
  //   description: "Connect without authentication",
  //   source: "custom",
  //   type: "no-auth",
  //   icon: <Globe className="h-5 w-5" />,
  //   data: {
  //     corsProxy: ENV.PRIVATE_CORS_PROXY,
  //     endpoint: "",
  //   },
  // }),
];

// Use distributive conditional types to properly narrow the form values
export type RemoteAuthFormValues<T extends RemoteAuthType = RemoteAuthType> = T extends any
  ? RemoteAuthSource extends any
    ? {
        guid: string;
        type: T;
        source: RemoteAuthSource;
        name: string;
        tags: string[];
        data: RemoteAuthDataFor<T>;
        templateType: TemplateType<T>;
      }
    : never
  : never;
type TemplateType<
  T extends RemoteAuthType = RemoteAuthType,
  U extends RemoteAuthSource = RemoteAuthSource,
> = `${T}/${U}`;
