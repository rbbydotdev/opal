// api.ts
export type RpcMethod<Args, Result, Mode extends "json" | "file" = "json"> = {
  args: Args;
  result: Result;
  mode: Mode;
};

export interface RpcApi {
  addUser: RpcMethod<{ name: string; age: number }, { id: string }>;
  uploadProfilePic: RpcMethod<{ userId: string }, { url: string }, "file">;
  // Add as many methods as you need
}
