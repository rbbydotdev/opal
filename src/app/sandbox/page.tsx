"use client";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useErrorToss } from "@/lib/errorToss";
import { useEffect } from "react";

// import { SidebarDndList } from "@/components/ui/SidebarDndList";

export default function Page() {
  return (
    <div className="w-full h-full items-center flex justify-center m-auto">
      <div className="bg-blue-200 w-96 h-96">
        <ErrorBoundary fallback={({ error }) => <div>Error occurred {error.toString()}</div>}>
          <ErrComponent />
        </ErrorBoundary>
      </div>
    </div>
  );
}

function ErrComponent() {
  const toss = useErrorToss();
  useEffect(() => {
    void (async function () {
      toss(new Error("Test error 123"));
    })();
  }, [toss]);
  return <div>Test</div>;
}
