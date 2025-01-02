"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentWorkspace } from "@/context";

export default function Page() {
  const currentWorkspace = useCurrentWorkspace();
  return (
    <div className="page flex justify-center items-center h-full w-full">
      <Card className="card w-96 h-96">
        <CardHeader>
          <CardTitle>Workspace {currentWorkspace?.name}</CardTitle>
          <CardDescription>guid: {currentWorkspace?.guid}</CardDescription>
        </CardHeader>
        <CardContent>
          <CardDescription>select a file to get started</CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
