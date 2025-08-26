// EditHistoryMenu.tsx;
import { EditViewImage } from "@/components/Editor/history/EditViewImage";
import { useSelectedItemScroll } from "@/components/Editor/history/useSelectedItemScroll";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollAreaViewportRef } from "@/components/ui/scroll-area-viewport-ref";
import { Separator } from "@/components/ui/separator";
import { useWorkspaceContext, useWorkspaceRoute } from "@/context/WorkspaceContext";
import { HistoryDocRecord, useSnapHistoryDB, useSnapHistoryPendingSave } from "@/Db/HistoryDAO";
import { useTimeAgoUpdater } from "@/hooks/useTimeAgoUpdater";
import { cn } from "@/lib/utils";
import { Cell, markdown$, markdownSourceEditorValue$ } from "@mdxeditor/editor";
import { ChevronDown, History } from "lucide-react";
import { Fragment, useState } from "react";
import { timeAgo } from "short-time-ago";

export const allMarkdown$ = Cell("", (realm) => {
  realm.sub(markdown$, (md) => {
    realm.pub(allMarkdown$, md);
  });
  realm.sub(markdownSourceEditorValue$, (md) => {
    realm.pub(allMarkdown$, md);
  });
  realm.pub(allMarkdown$, realm.getValue(markdown$));
});

export function EditHistoryMenu({
  finalizeRestore,
  disabled,
  edits,
  selectedEdit,
  setEdit,
  rebaseHistory,
  resetAndRestore,
  clearAll,
  triggerSave,
  isRestoreState,
  selectedEditMd,
}: {
  finalizeRestore: (md: string) => void;
  disabled?: boolean;
  edits: HistoryDocRecord[];
  selectedEdit: HistoryDocRecord | null;
  setEdit: (edit: HistoryDocRecord) => Promise<void>;
  rebaseHistory: (md: string) => void;
  resetAndRestore: () => Promise<void>;
  clearAll: () => Promise<void>;
  triggerSave: () => void;
  isRestoreState: boolean;
  selectedEditMd: string | null;
}) {
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceId = currentWorkspace.id; // Use the stable workspace GUID, not the name
  const { path: filePath } = useWorkspaceRoute();

  const historyDB = useSnapHistoryDB();
  const pendingSave = useSnapHistoryPendingSave({ historyDB });
  const [isOpen, setOpen] = useState(false);
  const { updateSelectedItemRef, scrollAreaRef } = useSelectedItemScroll({ isOpen });

  const finalizeAndRestore = () => {
    if (selectedEditMd) {
      console.debug("Finalizing restore with edit:", selectedEditMd.length);
      finalizeRestore(selectedEditMd);
      rebaseHistory(selectedEditMd);
    } else {
      console.warn("No edit selected to restore");
    }
  };

  const timeAgoStr = useTimeAgoUpdater({ date: selectedEdit?.timestamp ? new Date(selectedEdit?.timestamp) : null });

  if (disabled) {
    return null;
  }
  return (
    <div
      className={cn("relative flex items-center bg-primary-foreground pl-2 gap-2 font-mono text-sm", {
        "opacity-50": disabled,
      })}
    >
      <DropdownMenu open={isOpen} onOpenChange={setOpen}>
        <div className="h-full absolute left-4 flex justify-center items-center">
          <button className="fill-primary-foreground text-4xl leading-4 group" onClick={triggerSave}>
            <HistoryStatus selectedEdit={selectedEdit} pendingSave={pendingSave} />
          </button>
        </div>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <button tabIndex={0} className="h-8 cursor-pointer flex rounded-md border border-primary items-center p-1">
            <div className="pl-8 mr-2 flex items-center space-x-2 ">
              <span className="whitespace-nowrap">Edit history {timeAgoStr}</span>
            </div>
            <ChevronDown size={12} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[37.5rem] bg-primary-foreground p-0">
          {Boolean(edits.length) ? (
            <div className="border-b border-border p-2">
              <Button
                variant={"secondary"}
                size="default"
                onClick={() => {
                  void clearAll();
                  setOpen(false);
                }}
                className="text-left bg-primary border-2 p-2 rounded-xl text-primary-foreground hover:border-primary hover:bg-primary-foreground hover:text-primary"
              >
                clear
              </Button>
            </div>
          ) : null}
          <ScrollAreaViewportRef
            viewportRef={(ref) => {
              scrollAreaRef.current = ref;
            }}
            className={cn({
              "h-96": Boolean(edits.length),
              "h-18": !Boolean(edits.length),
            })}
          >
            <div className="p-1 font-mono">
              {edits.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
                  <div className="w-full flex justify-center items-center border-muted-foreground text-sm text-muted-foreground border border-dashed p-2">
                    empty
                  </div>
                </div>
              )}
              {edits.map((EDIT, index) => (
                <Fragment key={EDIT.edit_id}>
                  <DropdownMenuItem
                    ref={selectedEdit?.edit_id === EDIT.edit_id ? updateSelectedItemRef : null}
                    onSelect={() => setEdit(EDIT)}
                    className={cn("h-auto cursor-pointer p-1 py-2 focus:bg-sidebar-accent", {
                      "bg-sidebar-accent": selectedEdit && selectedEdit.edit_id === EDIT.edit_id,
                    })}
                  >
                    <div className="flex w-full items-center justify-start text-left text-sm">
                      {workspaceId && filePath ? (
                        <EditViewImage className="w-12 h-12" workspaceId={workspaceId} edit={EDIT} />
                      ) : null}
                      <div className="ml-4">
                        {!selectedEdit || selectedEdit.edit_id !== EDIT.edit_id ? (
                          <span className="mr-2 text-primary">{"•"}</span>
                        ) : (
                          <span className="-ml-1 mr-2 text-2xl font-bold text-ring">{"✓"}</span>
                        )}

                        {new Date(EDIT.timestamp).toLocaleString()}
                        <span className="text-primary">
                          &nbsp;
                          <span>{`- ${timeAgo(new Date(EDIT.timestamp))}`}</span>
                        </span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                  {index < edits.length - 1 && <Separator />}
                </Fragment>
              ))}
            </div>
          </ScrollAreaViewportRef>
        </DropdownMenuContent>
      </DropdownMenu>

      {isRestoreState && (
        <>
          <button
            onClick={finalizeAndRestore}
            className="font-bold rounded-xl text-xs border-2 bg-primary-foreground p-2 text-primary border-ring hover:bg-primary hover:text-primary-foreground"
          >
            OK
          </button>
          <button
            onClick={resetAndRestore}
            className="font-bold rounded-xl text-xs border-2 bg-primary-foreground p-2 text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground"
          >
            CANCEL
          </button>
        </>
      )}
    </div>
  );
}

function HistoryStatus({ selectedEdit, pendingSave }: { selectedEdit: HistoryDocRecord | null; pendingSave: boolean }) {
  if (selectedEdit !== null) {
    return (
      <div key={selectedEdit.edit_id} className="_animate-spin _animation-iteration-once ">
        <History size={16} className="-scale-x-100 inline-block !text-ring" />
      </div>
    );
  }
  if (pendingSave) {
    return (
      <div className="_animate-spin _animation-iteration-once ">
        <History size={16} className="-scale-x-100 inline-block !text-success" />
      </div>
    );
  }

  return (
    <div>
      <History size={16} className="-scale-x-100 inline-block !text-primary group-hover:!text-ring" />
    </div>
  );
}
