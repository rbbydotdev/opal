import { RemoteAuthDataFor, RemoteAuthSource } from "@/data/RemoteAuthTypes";
import { Channel } from "@/lib/channel";

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

  /**
   * Handle authorization code from popup and manage popup communication
   */
  protected async handleAuthorizationCode(
    channel: OAuthCbChannel,
    data: { code: string; state: string },
    config: OAuthProviderConfig,
    onSuccess: (data: RemoteAuthDataFor<"oauth">) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const authData = await this.validateAndProcessAuth(data, config);

      // Notify popup of success
      await channel.emit(OAuthCbEvents.SUCCESS, authData);

      // Tell popup it can close immediately
      await channel.emit(OAuthCbEvents.CLOSE_WINDOW);

      onSuccess(authData);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Token exchange failed";

      // Notify popup of error
      await channel.emit(OAuthCbEvents.ERROR, errorMsg);

      // Tell popup it can close immediately
      await channel.emit(OAuthCbEvents.CLOSE_WINDOW);

      onError(errorMsg);
    }
  }

  /**
   * Handle access token from popup (implicit flow) and manage popup communication
   */
  protected async handleAccessToken(
    channel: OAuthCbChannel,
    data: { accessToken: string; state: string },
    config: OAuthProviderConfig,
    onSuccess: (data: RemoteAuthDataFor<"oauth">) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const authData = await this.validateAndProcessAuth(data, config);

      // Notify popup of success
      await channel.emit(OAuthCbEvents.SUCCESS, authData);

      // Tell popup it can close immediately
      await channel.emit(OAuthCbEvents.CLOSE_WINDOW);

      onSuccess(authData);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Token processing failed";

      // Notify popup of error
      await channel.emit(OAuthCbEvents.ERROR, errorMsg);

      // Tell popup it can close immediately
      await channel.emit(OAuthCbEvents.CLOSE_WINDOW);

      onError(errorMsg);
    }
  }

  setupChannelListeners(
    channel: OAuthCbChannel,
    config: OAuthProviderConfig,
    onSuccess: (data: RemoteAuthDataFor<"oauth">) => void,
    onError: (error: string) => void
  ): void {
    // Handle authorization code flow (GitHub)
    channel.once(OAuthCbEvents.AUTHORIZATION_CODE, (data) => {
      void this.handleAuthorizationCode(channel, data, config, onSuccess, onError);
    });

    // Handle implicit flow (Netlify)
    channel.once(OAuthCbEvents.ACCESS_TOKEN, (data) => {
      void this.handleAccessToken(channel, data, config, onSuccess, onError);
    });
  }

  abstract validateAndProcessAuth(data: any, config: OAuthProviderConfig): Promise<RemoteAuthDataFor<"oauth">>;
}

const OAuthCbEvents = {
  SUCCESS: "success" as const,
  ERROR: "error" as const,
  AUTHORIZATION_CODE: "authorization_code" as const,
  ACCESS_TOKEN: "access_token" as const,
  CLOSE_WINDOW: "close_window" as const,
};

type OAuthCbEventPayload = {
  [OAuthCbEvents.SUCCESS]: RemoteAuthDataFor<"oauth">;
  [OAuthCbEvents.ERROR]: string;
  [OAuthCbEvents.AUTHORIZATION_CODE]: { code: string; state: string };
  [OAuthCbEvents.ACCESS_TOKEN]: { accessToken: string; state: string };
  [OAuthCbEvents.CLOSE_WINDOW]: void;
};

export class OAuthCbChannel extends Channel<OAuthCbEventPayload> {}
