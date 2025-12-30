interface BuildCtx {
  files?: string[];
  html?: string[];
  remoteData?: string;
}

export interface NodeDef<Ctx extends Record<string, any>> {
  id: string;
  dependsOn?: string[];
  run(ctx: Ctx): void | Promise<void>;
}

export class DataflowGraph<Ctx extends Record<string, any>> {
  private nodes: NodeDef<Ctx>[] = [];

  register(node: NodeDef<Ctx>) {
    this.nodes.push(node);
  }

  async run(initialCtx: Ctx): Promise<Ctx> {
    const ctx = { ...initialCtx };
    for (const node of this.nodes) {
      await node.run(ctx);
    }
    return ctx;
  }
}

export function makeNode<
  Ctx extends Record<string, any>,
  Inputs extends Partial<Ctx>,
  Outputs extends Record<string, any>,
>(fn: (ctx: Ctx & Inputs) => Outputs | Promise<Outputs>): NodeDef<Ctx> {
  return {
    id: fn.name || "anonymousNode",
    async run(ctx: Ctx) {
      // We know at runtime that `ctx` will satisfy `Ctx & Inputs` when appropriate,
      // but TS cannot prove it, so we assert here.
      Object.assign(ctx, await fn(ctx as Ctx & Inputs));
    },
  };
}

// -----------------------------------------------------------
// Example async graph using fetch-like behavior
// -----------------------------------------------------------
/*
const graph = new DataflowGraph<BuildCtx>();

// Simulated async file loader
const loadFiles = makeNode(async (_ctx: {}) => {
  // pretend this takes time
  await new Promise((r) => setTimeout(r, 200));
  console.log("Loaded files");
  return { files: ["a.md", "b.md"] };
});

// Fetch remote data (async dependency)
const fetchRemoteData = makeNode(async (_ctx: {}) => {
  console.log("Fetching remote data...");
  const data = await new Promise<string>((res) => setTimeout(() => res("Hello from server!"), 500));
  return { remoteData: data };
});

// Render step depends on both loaded files and remote data
const renderHtml = makeNode(async (ctx: { files: string[]; remoteData: string }) => {
  console.log("Rendering...");
  const html = ctx.files.map((f) => `<p>${f} - ${ctx.remoteData}</p>`);
  await new Promise((r) => setTimeout(r, 150));
  return { html };
});

graph.register(loadFiles);
graph.register(fetchRemoteData);
graph.register(renderHtml);

graph.run({}).then((finalCtx) => {
  console.log("Final context:", finalCtx);
});
*/
