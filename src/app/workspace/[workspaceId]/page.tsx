"use client";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspaceContext } from "@/context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  // const { currentWorkspace } = useContext(WorkspaceContext);
  return (
    <div className="w-full h-full flex items-center justify-center">
      {/* <LoadingPanel /> */}
      <FirstFileRedirect />
    </div>
  );
}

function FirstFileRedirect() {
  const { currentWorkspace, firstFile } = useWorkspaceContext();
  const router = useRouter();
  useEffect(() => {
    if (firstFile && currentWorkspace) {
      router.push(currentWorkspace.resolveFileUrl(firstFile.path));
    }
  }, [currentWorkspace, firstFile, router]);
  return null;
}
