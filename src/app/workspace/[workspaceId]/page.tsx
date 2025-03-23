"use client";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  // const { currentWorkspace } = useContext(WorkspaceContext);
  return (
    <div className="w-full h-full flex items-center justify-center">
      {/* <LoadingPanel /> */}
      {/* <FirstFileRedirect /> */}
    </div>
  );
}

// function FirstFileRedirect() {
//   const { currentWorkspace, firstFile } = useWorkspaceContext();
//   const router = useRouter();
//   useEffect(() => {
//     if (firstFile && currentWorkspace) {
//       router.push(currentWorkspace.resolveFileUrl(firstFile.path));
//     }

//     // router.push(currentWorkspace.tryFirstFileUrl());
//   }, [currentWorkspace, firstFile, router]);
//   return null;
// }
