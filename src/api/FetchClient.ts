import { optionalCORSBaseURL } from "@/lib/optionalCORSBaseURL";
import { stripLeadingSlash } from "@/lib/paths2";

export interface AuthStrategy {
  applyAuth(headers: Headers): void;
}

export interface CORSConfig {
  corsProxy?: string;
  targetDomain?: string;
}

export class BearerTokenAuth implements AuthStrategy {
  constructor(private token: string) {}

  applyAuth(headers: Headers): void {
    headers.set("Authorization", `Bearer ${this.token}`);
  }
}

export class BasicAuth implements AuthStrategy {
  constructor(
    private username: string,
    private password: string
  ) {}

  applyAuth(headers: Headers): void {
    const credentials = btoa(`${this.username}:${this.password}`);
    headers.set("Authorization", `Basic ${credentials}`);
  }
}

export class ApiKeyAuth implements AuthStrategy {
  constructor(
    private key: string,
    private headerName: string = "X-API-Key"
  ) {}

  applyAuth(headers: Headers): void {
    headers.set(this.headerName, this.key);
  }
}

export class NoAuth implements AuthStrategy {
  applyAuth(headers: Headers): void {
    // No authentication
  }
}

export class FetchClient {
  constructor(
    private authStrategy?: AuthStrategy,
    private baseURL?: string,
    private defaultHeaders?: Record<string, string>,
    private corsConfig?: CORSConfig
  ) {}

  async fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers || {});

    // Apply default headers
    if (this.defaultHeaders) {
      Object.entries(this.defaultHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }

    // Apply authentication
    this.authStrategy?.applyAuth(headers);

    // Handle input safely and apply CORS proxy if needed
    let requestUrl: string;

    if (typeof input === "string") {
      if (this.baseURL) {
        // Use stripLeadingSlash to ensure path is appended to baseURL, not replaced
        const cleanPath = stripLeadingSlash(input);
        // Ensure baseURL ends with slash so relative paths append instead of replace
        const baseURLWithSlash = this.baseURL.endsWith("/") ? this.baseURL : this.baseURL + "/";
        requestUrl = new URL(cleanPath, baseURLWithSlash).toString();
      } else {
        requestUrl = input;
      }
    } else if (input instanceof Request) {
      if (this.baseURL) {
        // Use stripLeadingSlash to ensure path is appended to baseURL, not replaced
        const cleanPath = stripLeadingSlash(input.url);
        // Ensure baseURL ends with slash so relative paths append instead of replace
        const baseURLWithSlash = this.baseURL.endsWith("/") ? this.baseURL : this.baseURL + "/";
        requestUrl = new URL(cleanPath, baseURLWithSlash).toString();
      } else {
        requestUrl = input.url;
      }
    } else {
      // This case should not happen given the RequestInfo type, but handle it for type safety
      throw new Error("Invalid input type for fetch request");
    }

    // Apply CORS proxy transformation
    if (this.corsConfig?.corsProxy) {
      const targetDomain = this.corsConfig.targetDomain || this.extractDomainFromBaseURL();
      if (targetDomain) {
        const corsProxiedUrl = optionalCORSBaseURL(this.corsConfig.corsProxy, `https://${targetDomain}`);
        if (corsProxiedUrl) {
          // Replace the original domain with the CORS proxied URL
          const originalUrl = new URL(requestUrl);
          const corsUrl = new URL(corsProxiedUrl);
          requestUrl = `${corsUrl.origin}${originalUrl.pathname}${originalUrl.search}${originalUrl.hash}`;
        }
      }
    }

    const response = await fetch(requestUrl, {
      ...init,
      headers,
    });

    return response;
  }

  private extractDomainFromBaseURL(): string | undefined {
    if (!this.baseURL) return undefined;
    try {
      return new URL(this.baseURL).host;
    } catch {
      return undefined;
    }
  }

  async json<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const response = await this.fetch(input, init);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }
}

// Convenience factory functions
export function createBearerTokenClient(token: string, baseURL?: string, corsConfig?: CORSConfig): FetchClient {
  return new FetchClient(
    new BearerTokenAuth(token),
    baseURL,
    {
      "Content-Type": "application/json",
    },
    corsConfig
  );
}

export function createBasicAuthClient(
  username: string,
  password: string,
  baseURL?: string,
  corsConfig?: CORSConfig
): FetchClient {
  return new FetchClient(
    new BasicAuth(username, password),
    baseURL,
    {
      "Content-Type": "application/json",
    },
    corsConfig
  );
}

export function createApiKeyClient(
  key: string,
  headerName?: string,
  baseURL?: string,
  corsConfig?: CORSConfig
): FetchClient {
  return new FetchClient(
    new ApiKeyAuth(key, headerName),
    baseURL,
    {
      "Content-Type": "application/json",
    },
    corsConfig
  );
}

export function createNoAuthClient(baseURL?: string, corsConfig?: CORSConfig): FetchClient {
  return new FetchClient(
    new NoAuth(),
    baseURL,
    {
      "Content-Type": "application/json",
    },
    corsConfig
  );
}

// Additional utility functions for CORS proxy
export function createCORSConfig(corsProxy?: string, targetDomain?: string): CORSConfig {
  return { corsProxy, targetDomain };
}

// Helper function to create a CORS-enabled client from existing optionalCORSBaseURL pattern
export function createBearerTokenClientWithCORSProxy(
  token: string,
  originalDomain: string,
  corsProxy?: string
): FetchClient {
  const baseURL = optionalCORSBaseURL(corsProxy, originalDomain) || `https://${originalDomain}`;

  // If CORS proxy was used, we don't need additional CORS config since the URL is already modified
  if (corsProxy) {
    return createBearerTokenClient(token, baseURL);
  } else {
    return createBearerTokenClient(token, baseURL);
  }
}
