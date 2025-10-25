import { RemoteAuthOAuthRecordInternal, RemoteAuthSource } from "@/Db/RemoteAuthTypes";
import { Channel } from "@/lib/channel";

export interface OAuthFlowResult {
  accessToken: string;
  tokenType: string;
  scope: string;
  obtainedAt: number;
  expiresIn: number;
  refreshToken: string;
}

export interface OAuthChannel {
  emit(event: string, data: any): Promise<void>;
  once(event: string): Promise<any>;
  tearDown(): void;
}

export interface OAuthProviderConfig {
  redirectUri: string;
  state: string;
  corsProxy?: string;
}

export abstract class OAuthProvider {
  protected source: RemoteAuthSource;

  constructor(source: RemoteAuthSource) {
    this.source = source;
  }

  abstract getAuthorizationUrl(config: OAuthProviderConfig): Promise<string> | string;

  abstract setupChannelListeners(
    channel: OAuthCbChannel,
    config: OAuthProviderConfig,
    onSuccess: (data: RemoteAuthOAuthRecordInternal) => void,
    onError: (error: string) => void
  ): void;

  abstract validateAndProcessAuth(data: any, config: OAuthProviderConfig): Promise<RemoteAuthOAuthRecordInternal>;
}

export const OAuthCbEvents = {
  SUCCESS: "success" as const,
  ERROR: "error" as const,
  AUTHORIZATION_CODE: "authorization_code" as const,
  ACCESS_TOKEN: "access_token" as const,
};

export type OAuthCbEventPayload = {
  [OAuthCbEvents.SUCCESS]: RemoteAuthOAuthRecordInternal;
  [OAuthCbEvents.ERROR]: string;
  [OAuthCbEvents.AUTHORIZATION_CODE]: { code: string; state: string };
  [OAuthCbEvents.ACCESS_TOKEN]: { accessToken: string; state: string };
};

export class OAuthCbChannel extends Channel<OAuthCbEventPayload> {}
