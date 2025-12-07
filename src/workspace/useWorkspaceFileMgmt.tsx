import { useFileTreeMenuCtx } from "@/components/filetree/FileTreeMenuContext";
import { flatUniqNodeArgs } from "@/components/filetree/flatUniqNodeArgs";
import { TreeDir, TreeFile, TreeNode } from "@/components/filetree/TreeNode";
import { SpecialDirs } from "@/data/SpecialDirs";
import { DefaultFile } from "@/lib/DefaultFile";
import { NotFoundError } from "@/lib/errors/errors";
import { useErrorToss } from "@/lib/errors/errorToss";
import {
  AbsPath,
  absPath,
  basename,
  dirname,
  duplicatePath,
  isAncestor,
  joinPath,
  reduceLineage,
  RelPath,
  relPath,
} from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

function defaultFileContentFromPath(path: AbsPath) {
  return DefaultFile.fromPath(path);
}

export function useWorkspaceFileMgmt(currentWorkspace: Workspace, { tossError = true } = {}) {
  const { setFileTreeCtx, selectedRange, resetEditing, focused } = useFileTreeMenuCtx();
  const toss = useErrorToss();
  const navigate = useNavigate();

  const newFile = useCallback(
    async (path: AbsPath, content = "", options: { redirect?: boolean } = {}) => {
      try {
        const result = await currentWorkspace.newFile(dirname(path), basename(path), content);
        if (options.redirect) {
          void navigate({ to: currentWorkspace.resolveFileUrl(result) });
        }
        return result;
      } catch (e) {
        console.error(e);
        if (tossError) {
          toss(e as Error);
        } else {
          throw e;
        }
      }
    },
    [currentWorkspace, navigate, toss, tossError]
  );
  const newDir = useCallback(
    async (path: AbsPath) => {
      return currentWorkspace.newDir(dirname(path), basename(path));
    },
    [currentWorkspace]
  );

  const removeFiles = useCallback(
    async (...paths: (AbsPath | AbsPath[] | TreeNode | TreeNode[])[]) => {
      const flatPaths = flatUniqNodeArgs(paths);
      if (!flatPaths.length) return;
      try {
        await currentWorkspace.removeMultiple(reduceLineage(flatPaths).map((pathStr) => absPath(pathStr)));
      } catch (e) {
        if (e instanceof NotFoundError) {
          console.error(e);
        } else {
          if (tossError) {
            toss(e as Error);
          } else {
            throw e;
          }
        }
      }
      setFileTreeCtx({
        editing: null,
        editType: null,
        focused: null,
        virtual: null,
        selectedRange: [],
        anchorIndex: -1,
      });
    },
    [currentWorkspace, setFileTreeCtx, toss, tossError]
  );

  const trashFiles = useCallback(
    async (paths: AbsPath[]) => {
      if (!paths.length) return;
      try {
        const alreadyTrashedNowDelete = paths.filter((path) => isAncestor({ parent: SpecialDirs.Trash, child: path }));
        if (alreadyTrashedNowDelete.length) {
          return removeFiles(alreadyTrashedNowDelete);
        } else {
          await currentWorkspace.trashMultiple(reduceLineage(paths));
        }
      } catch (e) {
        if (e instanceof NotFoundError) {
          console.error(e);
        } else {
          if (tossError) {
            toss(e as Error);
          } else {
            throw e;
          }
        }
      }
      setFileTreeCtx({
        editing: null,
        editType: null,
        focused: null,
        virtual: null,
        selectedRange: [],

        anchorIndex: -1,
      });
    },
    [currentWorkspace, removeFiles, setFileTreeCtx, toss, tossError]
  );

  const removeFile = useCallback(
    async (path: AbsPath) => {
      try {
        return await removeFiles([path]);
      } catch (e) {
        if (tossError) {
          toss(e as Error);
        } else {
          throw e;
        }
      }
    },
    [removeFiles, toss, tossError]
  );
  const trashFile = useCallback(
    async (path: AbsPath) => {
      try {
        return await trashFiles([path]);
      } catch (e) {
        if (tossError) {
          toss(e as Error);
        } else {
          throw e;
        }
      }
    },
    [toss, tossError, trashFiles]
  );

  const removeSelectedFiles = useCallback(async () => {
    const range = ([] as AbsPath[]).concat(selectedRange.map(absPath), focused ? [focused] : []);

    if (!range.length && focused) {
      range.push(focused);
    }
    try {
      await removeFiles(range);
    } catch (e) {
      if (tossError) {
        toss(e as Error);
      } else {
        throw e;
      }
    }
  }, [focused, removeFiles, selectedRange, toss, tossError]);

  const untrashFiles = useCallback(
    async (...filePaths: (AbsPath | TreeNode | AbsPath[] | TreeNode[])[]) => {
      setFileTreeCtx({
        editing: null,
        editType: null,
        focused: null,
        virtual: null,
        selectedRange: [],

        anchorIndex: -1,
      });
      try {
        return await currentWorkspace.untrashMultiple(flatUniqNodeArgs(filePaths));
      } catch (e) {
        if (tossError) {
          toss(e as Error);
        } else {
          throw e;
        }
      }
    },
    [currentWorkspace, setFileTreeCtx, toss, tossError]
  );

  const trashSelectedFiles = useCallback(async () => {
    const range = ([] as AbsPath[]).concat(selectedRange.map(absPath), focused ? [focused] : []);
    if (!range.length && focused) {
      range.push(focused);
    }
    setFileTreeCtx({
      editing: null,
      editType: null,
      focused: null,
      virtual: null,
      selectedRange: [],

      anchorIndex: -1,
    });
    const alreadyTrashedNowDelete = range.filter((path) => isAncestor({ parent: SpecialDirs.Trash, child: path }));
    try {
      if (alreadyTrashedNowDelete.length) {
        return await removeFiles(alreadyTrashedNowDelete);
      } else {
        return await currentWorkspace.trashMultiple(reduceLineage(range));
      }
    } catch (e) {
      if (tossError) {
        toss(e as Error);
      } else {
        throw e;
      }
    }
  }, [currentWorkspace, focused, removeFiles, selectedRange, setFileTreeCtx, toss, tossError]);

  const removeFocusedFile = useCallback(async () => {
    try {
      if (focused) await removeFiles([focused]);
    } catch (e) {
      if (tossError) {
        toss(e as Error);
      } else {
        throw e;
      }
    }
  }, [focused, removeFiles, toss, tossError]);

  const duplicateDirFile = useCallback(
    (type: TreeNode["type"], from: AbsPath | TreeNode) => {
      const fromNode = currentWorkspace.nodeFromPath(absPath(from));
      if (!fromNode) {
        throw new Error("Parent node not found");
      }

      const newNode = currentWorkspace.addVirtualFile({
        type,
        basename: basename(duplicatePath(fromNode.path)),
        selectedNode: fromNode.parent ?? fromNode,
        source: fromNode,
      });

      setFileTreeCtx({
        editing: newNode.path,
        editType: "duplicate",
        focused: newNode.path,
        virtual: newNode.path,
        selectedRange: [],

        anchorIndex: -1,
      });

      return newNode;
    },
    [currentWorkspace, setFileTreeCtx]
  );

  function addDirFile(type: "file", parent: TreeDir | AbsPath, fileName?: string, content?: string): TreeFile;
  function addDirFile(type: "dir", parent: TreeDir | AbsPath, dirName?: string): TreeDir;
  function addDirFile(type: TreeNode["type"], parent: TreeDir | AbsPath, name?: string, content?: string): TreeNode {
    let parentNode = currentWorkspace.nodeFromPath(absPath(parent)) ?? null;

    if (!parentNode) {
      console.warn("Parent node not found for adding new file or directory");
    }

    if ((parentNode && parentNode.isVirtual) || !parentNode) {
      parentNode = parentNode?.parent ?? currentWorkspace.getFileTreeRoot();
    }

    const fileName = name || (type === "dir" ? "newdir" : "newfile.md");

    const newNode = currentWorkspace.addVirtualFile({
      type,
      basename: relPath(fileName),
      selectedNode: parentNode,
      virtualContent: content,
    });

    setFileTreeCtx({
      editing: newNode.path,
      editType: "new",
      focused: newNode.path,
      virtual: newNode.path,
      selectedRange: [],
      anchorIndex: -1,
    });

    return newNode;
  }

  const renameDirOrFileMultiple = useCallback(
    async (nodes: [oldNode: TreeNode, newFullPath: TreeNode | AbsPath][]) => {
      try {
        const result = await currentWorkspace.renameMultiple(nodes);
        if (result.length === 0) return [];

        setFileTreeCtx({
          editing: null,
          editType: null,
          focused: null,
          virtual: null,
          selectedRange: [],

          anchorIndex: -1,
        });
        return result;
      } catch (e) {
        if (tossError) {
          toss(e as Error);
        } else {
          throw e;
        }
      }
    },

    [currentWorkspace, setFileTreeCtx, toss, tossError]
  );

  const renameDirOrFile = useCallback(
    async (origNode: TreeNode, newPath: TreeNode | AbsPath | RelPath) => {
      if (origNode.path === newPath) return null; // No change needed
      try {
        const result = await renameDirOrFileMultiple([[origNode, newPath]] as [TreeNode, TreeNode | AbsPath][]);
        if (!result || result.length <= 0) return null;
        return result[0]!.newPath;
      } catch (e) {
        if (tossError) {
          toss(e as Error);
        } else {
          throw e;
        }
      }
    },
    [renameDirOrFileMultiple, toss, tossError]
  );

  const commitChange = useCallback(
    async (origNode: TreeNode, fileName: RelPath, type: "rename" | "new" | "duplicate"): Promise<AbsPath | null> => {
      try {
        const wantPath = joinPath(dirname(origNode.path), relPath(fileName));
        if (type === "new") {
          if (origNode.isTreeFile()) {
            return (
              (await newFile(
                wantPath,
                origNode.isTreeNodeWithContent() ? origNode.virtualContent : defaultFileContentFromPath(wantPath),
                {
                  redirect: true,
                }
              )) ?? null
            );
          } else {
            return newDir(wantPath);
          }
        } else if (type === "duplicate") {
          return currentWorkspace.copyFile(origNode.source!, wantPath);
        } else if (type === "rename") {
          return (await renameDirOrFile(origNode, wantPath)) ?? null;
        } else {
          throw new Error("invalid commit type");
        }
      } catch (e) {
        if (tossError) {
          toss(e as Error);
          return null;
        } else {
          throw e;
        }
      }
    },
    [currentWorkspace, newDir, newFile, renameDirOrFile, toss, tossError]
  );
  return {
    renameDirOrFileMultiple,
    renameDirOrFile,
    newFile,
    removeFocusedFile,
    removeSelectedFiles,
    newDir,
    commitChange,
    addDirFile,
    trashSelectedFiles,
    removeFiles,
    removeFile,
    resetEditing,
    duplicateDirFile,
    untrashFiles,
    trashFile,
    trashFiles,
  };
}
