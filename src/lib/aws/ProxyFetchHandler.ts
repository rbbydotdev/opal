import type { FetchHttpHandlerOptions } from "@smithy/fetch-http-handler";
import { FetchHttpHandler } from "@smithy/fetch-http-handler";
import type { HttpRequest, HttpResponse } from "@smithy/protocol-http";
import { HttpRequest as HttpRequestClass } from "@smithy/protocol-http";
import type { HttpHandlerOptions } from "@smithy/types";

interface ProxyFetchHandlerOptions extends FetchHttpHandlerOptions {
  proxyUrl?: string;
}

export class ProxyFetchHandler extends FetchHttpHandler {
  private proxyUrl: string | undefined;

  constructor(options?: ProxyFetchHandlerOptions) {
    super(options);
    this.proxyUrl = options?.proxyUrl;
  }

  async handle(request: HttpRequest, options?: HttpHandlerOptions): Promise<{ response: HttpResponse }> {
    // If no proxy is configured, use default behavior
    if (!this.proxyUrl) {
      return super.handle(request, options);
    }

    // Extract the original host from the request
    const originalUrl = new URL(
      `${request.protocol}//${request.hostname}:${request.port || (request.protocol === "https:" ? 443 : 80)}${request.path}`
    );
    const originalHost = originalUrl.host;

    // Modify the URL to go through the proxy while preserving the original host in headers
    // The proxy expects: http://proxy-url/original-host/path
    const proxyUrl = new URL(this.proxyUrl);
    const proxyPort = proxyUrl.port ? parseInt(proxyUrl.port) : proxyUrl.protocol === "https:" ? 443 : 80;

    // Construct the new path that includes the original host
    const newPath = `/${originalHost}${request.path}`;

    // Create a new request with modified URL but preserve headers
    const modifiedHeaders = { ...request.headers };
    // Ensure the Host header matches what AWS expects for signature validation
    modifiedHeaders["Host"] = originalHost;

    // Create a proper HttpRequest object
    const modifiedRequest = new HttpRequestClass({
      method: request.method,
      protocol: proxyUrl.protocol,
      hostname: proxyUrl.hostname,
      port: proxyPort,
      path: newPath,
      query: request.query,
      headers: modifiedHeaders,
      body: request.body,
    });

    // console.debug("🔄 ProxyFetchHandler:", {
    //   original: `${request.protocol}//${request.hostname}${request.path}`,
    //   proxied: `${modifiedRequest.protocol}//${modifiedRequest.hostname}:${modifiedRequest.port}${modifiedRequest.path}`,
    //   hostHeader: modifiedRequest.headers["Host"],
    // });

    // Use the parent's handle method with our modified request
    return super.handle(modifiedRequest, options);
  }
}
