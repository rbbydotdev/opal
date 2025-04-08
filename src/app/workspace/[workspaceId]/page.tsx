"use client";

import { useWorkspaceContext } from "@/context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      {/* <LoadingPanel /> */}

      <FirstFileRedirectWithCurrentWorkspace />
      {/* <div className="rounded-xl text-accent-foreground p-8 border w-96 h-96 flex items-center flex-col gap-4 justify-center">
        <div>
          <Opal size={78} />
        </div>
        <div className="font-thin text-2xl font-mono text-center">welcome to your workspace</div>
      </div> */}
    </div>
  );
}

function FirstFileRedirect() {
  // function FirstFileRedirect({ currentWorkspace }: { currentWorkspace: Workspace; fileTreeDir: TreeDir }) {
  const router = useRouter();

  const { currentWorkspace } = useWorkspaceContext();
  useEffect(() => {
    if (currentWorkspace) currentWorkspace.tryFirstFileUrl().then((ff) => router.push(ff));
  }, [currentWorkspace, router]);
  return null;
}

// const FirstFileRedirectWithCurrentWorkspace = withCurrentWorkspace(FirstFileRedirect);
const FirstFileRedirectWithCurrentWorkspace = FirstFileRedirect;
