//These shapres are used to store and retrieve oauth to and fro indexdb
class OAuthProvider {
  protected accessToken: string;
  protected tokenType: string;
  protected scope: string;
  protected obtainedAt: number;

  constructor(accessToken: string, tokenType: string, scope: string, obtainedAt: number) {
    this.accessToken = accessToken;
    this.tokenType = tokenType;
    this.scope = scope;
    this.obtainedAt = obtainedAt;
  }

  toJSON() {
    return {
      accessToken: this.accessToken,
      tokenType: this.tokenType,
      scope: this.scope,
      obtainedAt: this.obtainedAt,
    };
  }
  static FromJSON({
    accessToken,
    tokenType,
    scope,
    obtainedAt,
    _type,
  }: {
    accessToken: string;
    tokenType: string;
    scope: string;
    obtainedAt: number;
    _type: string;
  }) {
    if (_type === "GithubProvider") {
      return new GithubProvider(accessToken, tokenType, scope, obtainedAt);
    }
    if (_type === "GoogleDriveProvider") {
      return new GoogleDocsProvider(accessToken, tokenType, scope, obtainedAt);
    }
    if (_type === "NetlifyProvider") {
      return new NetlifyProvider(accessToken, tokenType, scope, obtainedAt);
    }
    if (_type === "CloudflareProvider") {
      return new CloudflareProvider(accessToken, tokenType, scope, obtainedAt);
    }
    throw new Error("Unknown Provider type: " + _type);
    // return new OAuthProvider(accessToken, tokenType, scope, obtainedAt);
  }
}

// Extend the base class for GitHub
class GithubProvider extends OAuthProvider {
  constructor(accessToken: string, tokenType: string, scope: string, obtainedAt: number) {
    super(accessToken, tokenType, scope, obtainedAt);
  }

  // Add any GitHub-specific methods here
}

// Extend the base class for Google Drive
class GoogleDocsProvider extends OAuthProvider {
  private refreshToken?: string;
  private idToken?: string;

  constructor(
    accessToken: string,
    tokenType: string,
    scope: string,
    obtainedAt: number,
    refreshToken?: string,
    idToken?: string
  ) {
    super(accessToken, tokenType, scope, obtainedAt);
    this.refreshToken = refreshToken;
    this.idToken = idToken;
  }
}

// Extend the base class for Netlify
class NetlifyProvider extends OAuthProvider {
  constructor(accessToken: string, tokenType: string, scope: string, obtainedAt: number) {
    super(accessToken, tokenType, scope, obtainedAt);
  }

  // Add any Netlify-specific methods here
}

// Extend the base class for Cloudflare
class CloudflareProvider extends OAuthProvider {
  constructor(accessToken: string, tokenType: string, scope: string, obtainedAt: number) {
    super(accessToken, tokenType, scope, obtainedAt);
  }

  // Add any Cloudflare-specific methods here
}

// interface GitHubProvider {
//   _type: "GitHubProvider";
//   accessToken: string; // The access token received from GitHub
//   tokenType: string; // Typically "bearer"
//   scope: string; // The scopes granted by the user
//   expiresIn?: number; // Optional: Time in seconds until the token expires, if applicable
//   refreshToken?: string; // Optional: If using a refresh token flow
//   obtainedAt: number; // Timestamp when the token was obtained
//   state?: string; // The state parameter for CSRF protection, if used
//   // Add any additional fields you might need
// }
// interface GoogleDriveProvider {
//   _type: "GoogleDriveProvider";
//   accessToken: string; // The access token used to authenticate requests
//   tokenType: string; // Typically "Bearer"
//   expiresIn: number; // Time in seconds until the token expires
//   refreshToken?: string; // Optional: The refresh token to obtain new access tokens
//   scope: string; // The scopes granted by the user
//   obtainedAt: number; // Timestamp when the token was obtained
//   idToken?: string; // Optional: JWT token containing user identity information
//   // Add any additional fields you might need
// }

// interface GitHubProvider {
//   type: "GitHubProvider";
//   accessToken: string; // The access token received from GitHub
//   tokenType: string; // Typically "bearer"
//   scope: string; // The scopes granted by the user
//   expiresIn?: number; // Optional: Time in seconds until the token expires, if applicable
//   refreshToken?: string; // Optional: If using a refresh token flow
//   obtainedAt: number; // Timestamp when the token was obtained
//   state?: string; // The state parameter for CSRF protection, if used
//   idToken?: string; // Optional: JWT token containing user identity information
//   // Add any additional fields you might need
// }
// interface GoogleDriveProvider {
//   type: "GoogleDriveProvider";
//   accessToken: string; // The access token used to authenticate requests
//   tokenType: string; // Typically "Bearer"
//   expiresIn: number; // Time in seconds until the token expires
//   refreshToken?: string; // Optional: The refresh token to obtain new access tokens
//   scope: string; // The scopes granted by the user
//   obtainedAt: number; // Timestamp when the token was obtained
//   idToken?: string; // Optional: JWT token containing user identity information
//   // Add any additional fields you might need
// }
