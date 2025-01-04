"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceContext } from "@/context";
import { useRouter } from "next/navigation";
import { useContext, useEffect } from "react";

export default function Page() {
  // const { currentWorkspace } = useContext(WorkspaceContext);
  return (
    <div className="w-full h-full flex items-center justify-center">
      {/* <LoadingPanel /> */}
      <FirstFileRedirect />
      <WorkspaceCard />
    </div>
  );
}

function FirstFileRedirect() {
  const { currentWorkspace } = useContext(WorkspaceContext);
  const router = useRouter();
  useEffect(
    () =>
      currentWorkspace?.watchFileTree(async () => {
        const firstFile = await currentWorkspace.getFirstFile();
        if (firstFile && currentWorkspace) {
          router.push(currentWorkspace.resolveFileUrl(firstFile.path));
        }
      }),
    [currentWorkspace, router]
  );
  return <></>;
}
export function WorkspaceCard() {
  const { currentWorkspace } = useContext(WorkspaceContext);
  return (
    <div className="page flex justify-center items-center h-full w-full">
      <Card className="card w-96 h-96">
        <CardHeader>
          <CardTitle>Workspace {currentWorkspace?.name}</CardTitle>
          <CardDescription>guid: {currentWorkspace?.guid}</CardDescription>
        </CardHeader>
        <CardContent>
          <CardDescription>
            <div>
              <p>select a file to get started</p>
            </div>
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
