import { FILE_TREE_MENUS_TYPE } from "@/components/FileTreeProvider";
import { MainFileTreeContextMenu } from "@/lib/FileTree/MainFileTreeContextMenu";
import { TrashFileTreeContextMenu } from "@/lib/FileTree/TrashFileTreeContextMenu";
import React from "react";

const FileTreeContextMenus = {
  MainFiles: MainFileTreeContextMenu, //<MainFileTreeContextMenu>
  TrashFiles: TrashFileTreeContextMenu, //<TrashFileTreeContextMenu>
} satisfies {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in FILE_TREE_MENUS_TYPE]: React.ComponentType<any>;
};
type FileTreeContextMenuProps = React.ComponentProps<typeof MainFileTreeContextMenu> &
  React.ComponentProps<typeof TrashFileTreeContextMenu> & {
    fileTreeId: FILE_TREE_MENUS_TYPE;
  };
export const FileTreeContextMenu: React.FC<FileTreeContextMenuProps> = ({ fileTreeId: fileTreeId, ...props }) => {
  const ContextMenuComponent = FileTreeContextMenus[fileTreeId];
  return <ContextMenuComponent {...props} />;
};
