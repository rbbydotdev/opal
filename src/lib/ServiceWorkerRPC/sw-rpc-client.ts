// sw-rpc-client.ts
import { RpcApi, RpcMethod } from "./api";

// Helper types
type ClientRpcMethod<M extends RpcMethod<any, any, any>> = M["mode"] extends "file"
  ? (args: M["args"], body: Blob | File) => Promise<M["result"]>
  : (args: M["args"]) => Promise<M["result"]>;

type TypedRpcClient<Api extends RpcApi> = {
  [K in keyof Api]: ClientRpcMethod<Api[K]>;
};

class RpcError extends Error {
  constructor(
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = "RpcError";
  }
}

export function createRpcClient<Api extends RpcApi>(baseUrl: string): TypedRpcClient<Api> {
  // We need runtime access to the API definitions to determine `mode`
  // This hack uses a type assertion to create a "dummy" object for runtime lookup
  const apiDefinitions: { [K in keyof Api]: RpcMethod<any, any, any> } = {} as Api;

  return new Proxy(
    {},
    {
      get: (_, prop) => {
        return async (args: any, body?: Blob | File) => {
          const method = String(prop);
          const methodDef = apiDefinitions[method]; // Get the method definition

          if (!methodDef) {
            throw new Error(`RPC method "${method}" not defined in API.`);
          }

          let url = `${baseUrl}/${method}`;
          let fetchInit: RequestInit = { method: "POST" };

          // Use the defined mode for preparing the request
          if (methodDef.mode === "file") {
            const params = new URLSearchParams(args);
            url += `?${params.toString()}`;
            fetchInit.body = body;
          } else {
            fetchInit.headers = { "Content-Type": "application/json" };
            fetchInit.body = JSON.stringify(args);
          }

          const res = await fetch(url, fetchInit);
          const data = await res.json();

          if (!data.success) {
            throw new RpcError(data.error.message, data.error.code);
          }
          return data.data;
        };
      },
    }
  ) as TypedRpcClient<Api>;
}
