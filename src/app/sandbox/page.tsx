"use client";

import { SandboxWorkerAPIType } from "@/app/sandbox/sandbox-worker-api";
import { Button } from "@/components/ui/button";
import { wrap } from "comlink";
import { useMemo, useState } from "react";

export default function Page() {
  if (typeof Worker === "undefined") return null;
  return <Component />;
}

let count = 0;

const Component = () => {
  const worker = useMemo(() => new Worker(new URL("./sandbox.ww", import.meta.url), { type: "module" }) as Worker, []);
  const workerApi = useMemo(() => wrap<SandboxWorkerAPIType>(worker), [worker]);

  const [results, setResult] = useState<string[]>([]);

  return (
    <div className="w-full h-full flex items-center justify-center m-auto">
      <div className="h-96 w-[900px] border border-black grid grid-rows-[auto_1fr] gap-0">
        <div className="gap-4 w-full flex items-center justify-center  h-16">
          <Button
            onClick={() => {
              for (let i = 0; i < 10; i++) {
                const workerCount = count++;
                void workerApi
                  .dothing()
                  .then((f) => setResult((prev) => [...prev, `${f}:worker count ${workerCount}`]));
              }
            }}
          >
            Click
          </Button>
          <Button onClick={() => setResult([])}>Clear</Button>
        </div>
        <pre className="max-h-64 border-dashed border-2 overflow-scroll">{results.join("\n")}</pre>
      </div>
    </div>
  );
};
