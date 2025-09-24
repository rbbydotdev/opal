import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { AbsPath } from "@/lib/paths2";
import { useEffect, useState } from "react";

export interface FileWithWorkspace {
  path: AbsPath;
  workspaceName: string;
  workspaceHref: string;
}

export function useAllWorkspaceFiles() {
  const [files, setFiles] = useState<FileWithWorkspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAllFiles = async () => {
      try {
        const workspaces = await WorkspaceDAO.all();
        const filePromises = workspaces.map(async (workspace) => {
          try {
            const workspaceModel = workspace.toModel();
            await workspaceModel.init();
            const files = workspaceModel.flatTree || [];
            return files.map((file: AbsPath) => ({
              path: file,
              workspaceName: workspace.name,
              workspaceHref: workspace.href,
            }));
          } catch (error) {
            console.warn(`Failed to load files for workspace ${workspace.name}:`, error);
            return [];
          }
        });
        
        const allWorkspaceFiles = await Promise.all(filePromises);
        setFiles(allWorkspaceFiles.flat());
      } catch (error) {
        console.error('Failed to load workspace files:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllFiles();
  }, []);

  return { files, loading };
}