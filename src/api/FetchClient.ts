export class FetchClient {
  constructor(
    private apiToken: string,
    private baseURL?: string
  ) {}

  async fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers || {});
    headers.set("Authorization", `Bearer ${this.apiToken}`);

    // Handle input safely
    let requestUrl: string | Request = input;

    if (typeof input === "string") {
      requestUrl = this.baseURL ? new URL(input, this.baseURL).toString() : input;
    } else if (input instanceof Request) {
      requestUrl = this.baseURL ? new URL(input.url, this.baseURL).toString() : input.url;
    }

    const response = await fetch(requestUrl, {
      ...init,
      headers,
    });

    return response;
  }
}
