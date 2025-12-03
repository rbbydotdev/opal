// EditHistoryMenu.tsx;
import { EditViewImage } from "@/app/editor/history/EditViewImage";
import { useSelectedItemScroll } from "@/app/editor/history/useSelectedItemScroll";
import { useToggleEditHistory } from "@/app/editor/history/useToggleEditHistory";
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
import { useSnapHistoryDB, useSnapHistoryPendingSave } from "@/data/dao/HistoryDAO";
import { HistoryDocRecord } from "@/data/HistoryTypes";
import { useTimeAgoUpdater } from "@/hooks/useTimeAgoUpdater";
import { cn } from "@/lib/utils";
import { Cell, markdown$, markdownSourceEditorValue$ } from "@mdxeditor/editor";
import { Check, CheckCircle2, ChevronDown, Circle, Clock, History, X } from "lucide-react";
import { Fragment, useState } from "react";
import { timeAgo } from "short-time-ago";
import { useToggleHistoryImageGeneration } from "./useToggleHistoryImageGeneration";

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
  finalizeRestore = () => {},
  disabled,
  edits = [],
  selectedEdit = null,
  setEdit = async () => {},
  rebaseHistory = () => {},
  resetAndRestore = async () => {},
  clearAll = async () => {},
  triggerSave = () => {},
  isRestoreState = false,
  selectedEditMd = null,
}: {
  finalizeRestore?: (md: string) => void;
  disabled?: boolean;
  edits?: HistoryDocRecord[];
  selectedEdit?: HistoryDocRecord | null;
  setEdit?: (edit: HistoryDocRecord) => Promise<void>;
  rebaseHistory?: (md: string) => void;
  resetAndRestore?: () => Promise<void>;
  clearAll?: () => Promise<void>;
  triggerSave?: () => void;
  isRestoreState?: boolean;
  selectedEditMd?: string | null;
}) {
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceId = currentWorkspace.id; // Use the stable workspace GUID, not the name
  const { path: filePath } = useWorkspaceRoute();

  const historyDB = useSnapHistoryDB();
  const pendingSave = useSnapHistoryPendingSave({ historyDB });
  const [isOpen, setOpen] = useState(false);
  const { updateSelectedItemRef, scrollAreaRef } = useSelectedItemScroll({ isOpen });
  const { isEditHistoryEnabled, toggleEditHistory } = useToggleEditHistory();
  const { isHistoryImageGenerationEnabled, toggleHistoryImageGeneration } = useToggleHistoryImageGeneration();

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

  // When disabled, show minimal UI with just the toggle
  if (disabled) {
    return (
      <div className="relative flex items-center pl-1 gap-2 font-mono text-sm opacity-50 mr-1">
        <DropdownMenu open={isOpen} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              tabIndex={0}
              className="mr-1 h-8 bg-primary-foreground text-primary cursor-pointer flex rounded-md border border-primary items-center p-1"
              title="Edit History (disabled)"
              aria-label="Edit History (disabled)"
            >
              <div className=" mr-2 flex items-center space-x-2">
                <span className="whitespace-nowrap flex justify-start items-center gap-2 pl-2">
                  {/* <X className="w-4 h-4" /> */}
                  {/* Edit history */}
                  <Clock size={16} />
                </span>
              </div>
              <ChevronDown size={12} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[20rem] bg-background p-0">
            <div className="border-b border-border p-2">
              <Button
                variant={"secondary"}
                size="default"
                onClick={() => {
                  toggleEditHistory();
                  setOpen(false);
                }}
                className="text-left bg-primary border-2 p-2 rounded-xl text-primary-foreground hover:border-primary hover:bg-primary-foreground hover:text-primary flex items-center gap-1"
              >
                <Check className="w-3 h-3" strokeWidth={4} />
                enable
              </Button>
            </div>
            <div className="p-4 text-center text-muted-foreground text-sm">History tracking is disabled</div>
            <Separator />
            <div className="p-4 text-center text-muted-foreground text-2xs italic bold muted uppercase">
              ⚠️ beta feature ⚠️
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
  return (
    <div
      className={cn("relative flex items-center pl-2 gap-2 font-mono text-sm mx-2", {
        "opacity-50": disabled,
      })}
    >
      <DropdownMenu open={isOpen} onOpenChange={setOpen}>
        <div className="h-full absolute left-4 flex justify-center items-center ">
          <button className="fill-primary-foreground text-4xl leading-4 group" onClick={triggerSave}>
            <HistoryStatus selectedEdit={selectedEdit} pendingSave={pendingSave} />
          </button>
        </div>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <button
            tabIndex={0}
            className="mx-1 h-8 bg-primary-foreground text-primary cursor-pointer flex rounded-md border border-primary items-center p-1"
            title={"Edit History" + (edits.length ? ` (${edits.length} edits)` : "")}
          >
            <div className="pl-8 mr-2 flex items-center space-x-2 ">
              <span className="whitespace-nowrap">Edit history {timeAgoStr}</span>
            </div>
            <ChevronDown size={12} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[37.5rem] bg-background p-0">
          <div className="border-b border-border p-2 flex gap-2">
            {Boolean(edits.length) ? (
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
            ) : null}
            <Button
              variant={"secondary"}
              size="default"
              onClick={() => {
                toggleEditHistory();
                setOpen(false);
              }}
              className="text-left bg-primary border-2 p-2 rounded-xl text-primary-foreground hover:border-primary hover:bg-primary-foreground hover:text-primary flex items-center gap-1"
            >
              {isEditHistoryEnabled && (
                <>
                  <X className="w-3 h-3" strokeWidth={4} />
                  disable
                </>
              )}
            </Button>
            <Button
              variant={"secondary"}
              size="default"
              onClick={() => {
                toggleHistoryImageGeneration();
                setOpen(false);
              }}
              className="text-left bg-primary border-2 p-2 rounded-xl text-primary-foreground hover:border-primary hover:bg-primary-foreground hover:text-primary flex items-center gap-1"
            >
              {isHistoryImageGenerationEnabled ? (
                <>
                  <X className="w-3 h-3" strokeWidth={4} />
                  disable images
                </>
              ) : (
                <>
                  <Check className="w-3 h-3" strokeWidth={4} />
                  enable images
                </>
              )}
            </Button>
          </div>

          <ScrollAreaViewportRef
            viewportRef={(ref) => {
              scrollAreaRef.current = ref;
            }}
            className={cn({
              "h-96": Boolean(edits.length),
              "h-18": !Boolean(edits.length),
            })}
          >
            {/* <div></div> */}
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
                    className={cn("h-auto cursor-pointer focus:bg-sidebar-accent", {
                      "bg-sidebar-accent": selectedEdit && selectedEdit.edit_id === EDIT.edit_id,
                      "p-1 py-2": isHistoryImageGenerationEnabled,
                      "p-1 py-1": !isHistoryImageGenerationEnabled,
                    })}
                  >
                    <div
                      className={cn("flex w-full items-center justify-start text-left", {
                        "text-sm": isHistoryImageGenerationEnabled,
                        "text-xs": !isHistoryImageGenerationEnabled,
                      })}
                    >
                      {workspaceId && filePath && isHistoryImageGenerationEnabled ? (
                        <EditViewImage className="w-12 h-12" workspaceId={workspaceId} edit={EDIT} />
                      ) : null}
                      <div className={isHistoryImageGenerationEnabled ? "ml-4" : "ml-0"}>
                        {!selectedEdit || selectedEdit.edit_id !== EDIT.edit_id ? (
                          <Circle className="inline-block mr-2 text-primary" size={16} strokeWidth={2} />
                        ) : (
                          <CheckCircle2 className="inline-block mr-2 text-ring" size={16} strokeWidth={2} />
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
