"use client";

import { WorkspaceLiveEditor } from "@/components/WorkspaceLiveEditor";

export default function Page() {
  return (
    <div className="overflow-auto min-w-full w-0">
      <div className="overflow-auto min-w-full w-0">
        <WorkspaceLiveEditor />
      </div>
    </div>
  );
}
