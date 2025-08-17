// sw-rpc-server.ts

import { RpcMethod } from "@/lib/ServiceWorkerRPC/api";

// Helper types to infer handler signatures from the API definition
type RpcHandlerFor<M extends RpcMethod<any, any, any>> = M["mode"] extends "file"
  ? (args: M["args"], body: Blob) => Promise<M["result"]> | M["result"]
  : (args: M["args"]) => Promise<M["result"]> | M["result"];

type RpcHandlers<Api extends { [K in keyof Api]: RpcMethod<any, any, any> }> = {
  [K in keyof Api]: RpcHandlerFor<Api[K]>;
};

// The response envelope
type RpcResponse<Result> =
  | { success: true; data: Result }
  | { success: false; error: { message: string; code?: string } };

class RpcExecutor {
  constructor(private handler: (req: Request) => Promise<Response>) {}
  matches = (pathname: string) => pathname.endsWith(this.path);
  exec = (req: Request) => this.handler(req);
  path = ""; // Will be set by the factory
}

export function createRpcServer<Api extends { [K in keyof Api]: RpcMethod<any, any, any> }>(
  handlers: RpcHandlers<Api>
) {
  const executors = new Map<keyof Api, RpcExecutor>();

  // Get the RPC method definitions from the Api interface for mode inference
  const apiDefinitions: { [K in keyof Api]: RpcMethod<any, any, any> } = {} as any;

  for (const key in handlers) {
    const path = `/${key}`;
    const handlerFn = handlers[key];
    const methodDef = apiDefinitions[key]; // Access the method definition

    const executor = new RpcExecutor(async (request) => {
      try {
        let args: any;
        let body: Blob | undefined;

        // Use the defined mode for parsing
        if (methodDef.mode === "file") {
          const url = new URL(request.url);
          args = Object.fromEntries(url.searchParams.entries());
          body = await request.blob();
        } else {
          args = await request.json();
        }

        const result = await (handlerFn as any)(args, body);
        const response: RpcResponse<any> = { success: true, data: result };
        return new Response(JSON.stringify(response));
      } catch (err: any) {
        const response: RpcResponse<any> = {
          success: false,
          error: { message: err.message, code: err.code },
        };
        return new Response(JSON.stringify(response));
      }
    });
    executor.path = path;
    executors.set(key, executor);
  }

  return {
    findHandler: (pathname: string) => {
      for (const [_, executor] of executors) {
        if (executor.matches(pathname)) return executor;
      }
      return undefined;
    },
  };
}
