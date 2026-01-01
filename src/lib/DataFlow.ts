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

export class DataflowGraph<Ctx extends Record<string, any>, NodeNames extends string = never> {
  private nodes: NodeDef<Ctx>[] = [];

  register(node: NodeDef<Ctx>) {
    this.nodes.push(node);
  }

  node<Name extends string, Inputs extends Partial<Ctx>, Outputs extends Record<string, any>>(
    name: Name,
    dependsOn: NodeNames[] | undefined,
    fn: (ctx: Ctx & Inputs) => Outputs | Promise<Outputs>
  ): DataflowGraph<Ctx & Outputs, NodeNames | Name>;
  node<Name extends string, Inputs extends Partial<Ctx>, Outputs extends Record<string, any>>(
    name: Name,
    fn: (ctx: Ctx & Inputs) => Outputs | Promise<Outputs>
  ): DataflowGraph<Ctx & Outputs, NodeNames | Name>;
  node<Name extends string, Inputs extends Partial<Ctx>, Outputs extends Record<string, any>>(
    name: Name,
    dependsOnOrFn: NodeNames[] | undefined | ((ctx: Ctx & Inputs) => Outputs | Promise<Outputs>),
    fn?: (ctx: Ctx & Inputs) => Outputs | Promise<Outputs>
  ): DataflowGraph<Ctx & Outputs, NodeNames | Name> {
    let actualDependsOn: NodeNames[] | undefined;
    let actualFn: (ctx: Ctx & Inputs) => Outputs | Promise<Outputs>;

    if (typeof dependsOnOrFn === 'function') {
      actualDependsOn = undefined;
      actualFn = dependsOnOrFn;
    } else {
      actualDependsOn = dependsOnOrFn;
      actualFn = fn!;
    }

    const nodeDef: NodeDef<Ctx> = {
      id: name as string,
      ...(actualDependsOn ? { dependsOn: actualDependsOn as string[] } : {}),
      async run(ctx: Ctx) {
        Object.assign(ctx, await actualFn(ctx as Ctx & Inputs));
      },
    };
    this.nodes.push(nodeDef);
    return this as any as DataflowGraph<Ctx & Outputs, NodeNames | Name>;
  }

  private topologicalSort(): NodeDef<Ctx>[] {
    const sorted: NodeDef<Ctx>[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const nodeMap = new Map<string, NodeDef<Ctx>>();

    for (const node of this.nodes) {
      nodeMap.set(node.id, node);
    }

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      if (visiting.has(nodeId)) {
        throw new Error(`Circular dependency detected involving node: ${nodeId}`);
      }

      visiting.add(nodeId);
      const node = nodeMap.get(nodeId);
      if (!node) {
        throw new Error(`Node not found: ${nodeId}`);
      }

      if (node.dependsOn) {
        for (const depId of node.dependsOn) {
          if (!nodeMap.has(depId)) {
            throw new Error(`Dependency not found: ${depId} (required by ${nodeId})`);
          }
          visit(depId);
        }
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      sorted.push(node);
    };

    for (const node of this.nodes) {
      visit(node.id);
    }

    return sorted;
  }

  async run(initialCtx: Partial<Ctx> = {}): Promise<Ctx> {
    const ctx = { ...initialCtx } as Ctx;
    const sortedNodes = this.topologicalSort();
    for (const node of sortedNodes) {
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

graph
  .node("loadFiles", async () => {
    await new Promise((r) => setTimeout(r, 200));
    console.log("Loaded files");
    return { files: ["a.md", "b.md"] };
  })
  .node("fetchRemoteData", async () => {
    console.log("Fetching remote data...");
    const data = await new Promise<string>((res) => setTimeout(() => res("Hello from server!"), 500));
    return { remoteData: data };
  })
  .node(
    "renderHtml",
    async (ctx: BuildCtx & { files: string[]; remoteData: string }) => {
      console.log("Rendering...");
      const html = ctx.files.map((f) => `<p>${f} - ${ctx.remoteData}</p>`);
      await new Promise((r) => setTimeout(r, 150));
      return { html };
    },
    ["loadFiles", "fetchRemoteData"]
  )
  .run({})
  .then((finalCtx) => {
    console.log("Final context:", finalCtx);
  });
*/
