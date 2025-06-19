// import { useWorkspaceContext } from "@/context/WorkspaceHooks";
// import { useFileTreeExpander } from "@/hooks/useFileTreeExpander";
// import { useWorkspaceFileMgmt } from "@/hooks/useWorkspaceFileMgmt";

// export function useFileTreeActionsForCurrentWorkspace() {
//   const { currentWorkspace, flatTree, workspaceRoute } = useWorkspaceContext();
//   const { addDirFile, renameDirOrFileMultiple, removeSelectedFiles } = useWorkspaceFileMgmt(currentWorkspace);
//   const { expandForNode } = useFileTreeExpander({
//     flatTree,
//     activePath: workspaceRoute.path,
//     workspaceId: currentWorkspace.id,
//   });

//   return {
//     addDirFile,
//     addFile: () => expandForNode(addDirFile("file"), true),
//     addDir: () => expandForNode(addDirFile("dir"), true),
//     renameDirOrFileMultiple,
//     removeSelectedFiles,
//   };
// }
