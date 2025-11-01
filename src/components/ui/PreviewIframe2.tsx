// import { PreviewComponent } from "@/app/PreviewComponent3";
// import { useWindowPreview } from "@/app/PreviewCore";
// import { useWorkspaceRoute } from "@/context/WorkspaceContext";
// import { Workspace } from "@/data/Workspace";
// import { useResolvePathForPreview } from "@/features/preview-pane/useResolvePathForPreview";
// import { scrollEmitterSession } from "@/hooks/useScrollSyncForEditor";
// import { AbsPath, relPath } from "@/lib/paths2";
// import { ExternalLink, Loader, RefreshCw } from "lucide-react";
// import { useState } from "react";

// export function PreviewIFrame2({
//   previewPath,
//   currentWorkspace,
// }: {
//   previewPath?: AbsPath | null;
//   currentWorkspace: Workspace;
// }) {
//   const [showSpinner, setShowSpinner] = useState(true);
//   const [refreshKey, setRefreshKey] = useState(0);

//   // Window preview functionality
//   const { path } = useWorkspaceRoute();

//   const previewNode = useResolvePathForPreview({ path, currentWorkspace });

//   const windowSessionId = scrollEmitterSession({ workspaceId: currentWorkspace.id, path }, "window");
//   // const containerRef = useRef<HTMLDivElement>(null);
//   const { handleOpenWindow } = useWindowPreview({
//     currentWorkspace,
//     sessionId: windowSessionId,
//     actualPath: previewNode?.path || path,
//   });

//   // // Create session ID for window (separate from iframe)
//   // const sessionId = currentWorkspace && actualPath ? `${currentWorkspace.name}:${actualPath}:window` : undefined;

//   // Cleanup scroll emitter on unmount

//   const handleRefresh = () => {
//     setShowSpinner(true);
//     setRefreshKey((prev) => prev + 1);
//     // Spinner will be hidden when content finishes loading
//   };

//   return (
//     <div className="h-full w-full relative flex flex-col">
//       <div className="w-full h-12 bg-sidebar z-10 flex items-center text-sm py-2 font-bold px-4">
//         <button
//           onClick={handleRefresh}
//           className="flex items-center justify-center w-8 h-8 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
//           title="Refresh preview"
//         >
//           <RefreshCw size={16} />
//         </button>
//         <div className="flex items-center gap-2 truncate flex-1 justify-center">
//           <span className="font-light font-mono before:content-['['] after:content-[']']">PREVIEW2</span>
//           {" / "}
//           <span className="truncate font-mono">{relPath(previewPath!)}</span>
//         </div>
//         <button
//           onClick={handleOpenWindow}
//           className="flex items-center justify-center w-8 h-8 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
//           title="Open preview in new window"
//         >
//           <ExternalLink size={16} />
//         </button>
//       </div>

//       {showSpinner && (
//         <div className="w-full h-full flex m-auto inset-0 absolute justify-center items-center bg-background">
//           <div className="animate-spin animation-iteration-infinite">
//             <Loader size={24} />
//           </div>
//         </div>
//       )}

//       <div key={refreshKey} className="flex-grow relative">
//         {/* <PreviewComponent2 onContentLoaded={() => setShowSpinner(false)} /> */}
//         <PreviewComponent />
//       </div>
//     </div>
//   );
// }

// // funcion
