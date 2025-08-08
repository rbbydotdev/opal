import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertFrontmatter,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  Separator,
  StrikeThroughSupSubToggles,
  UndoRedo,
} from "@mdxeditor/editor";
import { ReactNode } from "react";

/**
 * A toolbar component that includes all toolbar components.
 * Notice that some of the buttons will work only if you have the corresponding plugin enabled, so you should use it only for testing purposes.
 * You'll probably want to create your own toolbar component that includes only the buttons that you need.
 * @group Toolbar Components
 */
export const MdxToolbar = ({ children }: { children?: ReactNode }) => {
  return (
    <>
      <DiffSourceToggleWrapper>
        {children}
        <UndoRedo />
        <Separator />
        <BoldItalicUnderlineToggles />
        <Separator />
        <BlockTypeSelect />
        <Separator />
        <ListsToggle />
        <Separator />
        <CreateLink />
        <InsertImage />
        <Separator />
        <InsertThematicBreak />
        <Separator />
        <StrikeThroughSupSubToggles options={["Strikethrough"]} />
        <Separator />
        <InsertTable />
        <Separator />
        <InsertFrontmatter />
      </DiffSourceToggleWrapper>
    </>
  );
};
