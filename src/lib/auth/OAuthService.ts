import { RemoteAuthOAuthRecordInternal, RemoteAuthSource } from "@/data/RemoteAuthTypes";
import { nanoid } from "nanoid";
import { GitHubOAuthProvider } from "./providers/GitHubOAuthProvider";
import { NetlifyOAuthProvider } from "./providers/NetlifyOAuthProvider";
import { OAuthCbChannel, OAuthProvider } from "./providers/OAuthProvider";

export interface OAuthServiceConfig {
  source: RemoteAuthSource;
  corsProxy?: string;
  onSuccess: (data: RemoteAuthOAuthRecordInternal) => void;
  onError: (error: string) => void;
  onStateChange: (state: OAuthState) => void;
}

export type OAuthState = "idle" | "authenticating" | "success" | "error";

export class OAuthService {
  private provider: OAuthProvider | null = null;
  private channel: OAuthCbChannel | null = null;
  private popup: Window | null = null;
  private checkClosedInterval: number | null = null;
  private state: OAuthState = "idle";

  private config: OAuthServiceConfig | null = null;

  private getProvider(source: RemoteAuthSource): OAuthProvider {
    switch (source) {
      case "github":
        return new GitHubOAuthProvider();
      case "netlify":
        return new NetlifyOAuthProvider();
      default:
        throw new Error(`Unsupported OAuth source: ${source}`);
    }
  }

  private setState(newState: OAuthState): void {
    this.state = newState;
    this.config?.onStateChange(newState);
  }

  private cleanup(): void {
    if (this.checkClosedInterval) {
      clearInterval(this.checkClosedInterval);
      this.checkClosedInterval = null;
    }

    if (this.popup) {
      this.popup.close();
      this.popup = null;
    }

    if (this.channel) {
      this.channel.tearDown();
      this.channel = null;
    }

    this.provider = null;
  }

  private handleSuccess = (data: RemoteAuthOAuthRecordInternal): void => {
    this.setState("success");
    this.config?.onSuccess(data);
    this.cleanup();
  };

  private handleError = (error: string): void => {
    this.setState("error");
    this.config?.onError(error);
    this.cleanup();
  };

  async startOAuthFlow(config: OAuthServiceConfig): Promise<void> {
    if (this.state === "authenticating") {
      throw new Error("OAuth flow already in progress");
    }

    this.config = config;
    this.setState("authenticating");

    try {
      // Clean up any existing state
      this.cleanup();

      // Get the appropriate provider
      this.provider = this.getProvider(config.source);

      // Create and initialize the channel
      const channelName = "oauth-callback";
      this.channel = new OAuthCbChannel(channelName);
      this.channel.init();

      // Set up channel listeners
      void this.channel.once("success").then(this.handleSuccess);
      void this.channel.once("error").then(this.handleError);

      // Setup provider-specific listeners
      this.provider.setupChannelListeners(
        this.channel,
        {
          redirectUri: `${window.location.origin}/auth/${config.source}`,
          state: nanoid(),
          corsProxy: config.corsProxy,
        },
        this.handleSuccess,
        this.handleError
      );

      // Get authorization URL
      const authUrl = await this.provider.getAuthorizationUrl({
        redirectUri: `${window.location.origin}/auth/${config.source}`,
        state: nanoid(),
        corsProxy: config.corsProxy,
      });

      // Open popup window
      this.popup = window.open(authUrl, "oauth-popup", "width=600,height=700,scrollbars=yes,resizable=yes");

      // Check if popup was blocked
      if (!this.popup) {
        this.handleError("Popup was blocked. Please allow popups and try again.");
        return;
      }

      // Monitor popup for closure without completing auth
      this.checkClosedInterval = window.setInterval(() => {
        if (this.popup?.closed && this.state === "authenticating") {
          this.handleError("Authorization was cancelled");
        }
      }, 1000);
    } catch (error) {
      this.handleError(error instanceof Error ? error.message : "Failed to initiate OAuth flow");
    }
  }

  cancelOAuthFlow(): void {
    if (this.state === "authenticating") {
      this.handleError("Authorization was cancelled");
    }
  }

  getState(): OAuthState {
    return this.state;
  }

  isAuthenticating(): boolean {
    return this.state === "authenticating";
  }

  destroy(): void {
    this.cleanup();
    this.setState("idle");
    this.config = null;
  }
}
