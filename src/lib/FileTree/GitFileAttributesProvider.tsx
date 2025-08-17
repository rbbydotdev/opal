import { createFileTreeAttributesContext } from "@/lib/FileTree/FileTreeAttributesProvider";

export type GitFileAttributes = "merge-conflict";

export const { Provider: FileTreeGitFileAttributesProvider, useFileTreeAttributes: useFileTreeGitAttributes } =
  createFileTreeAttributesContext<GitFileAttributes>();
