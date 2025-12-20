// EditHistoryMenu.tsx;
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollAreaViewportRef } from "@/components/ui/scroll-area-viewport-ref";
import { Separator } from "@/components/ui/separator";
import { HistoryDocRecord } from "@/data/dao/HistoryDocRecord";
import { EditViewImage } from "@/editor/history/EditViewImage";
import { useDocHistoryEdits } from "@/editor/history/HistoryPlugin3";
import { useSelectedItemScroll } from "@/editor/history/useSelectedItemScroll";
import { useToggleEditHistory } from "@/editor/history/useToggleEditHistory";
import { useTimeAgoUpdater } from "@/hooks/useTimeAgoUpdater";
import { cn } from "@/lib/utils";
import { useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { Check, CheckCircle2, ChevronDown, Circle, Clock, History, X } from "lucide-react";
import { Fragment, useState } from "react";
import { timeAgo } from "short-time-ago";
import { useToggleHistoryImageGeneration } from "./useToggleHistoryImageGeneration";

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

export function EditHistoryMenu() {
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceId = currentWorkspace.id; // Use the stable workspace GUID, not the name
  const { path: filePath } = useWorkspaceRoute();

  const disabled = false;
  const selectedEditMd = null;
  const pendingSave = false;
  const [isOpen, setOpen] = useState(false);
  const { updateSelectedItemRef, scrollAreaRef } = useSelectedItemScroll({ isOpen });
  const { isEditHistoryEnabled, toggleEditHistory } = useToggleEditHistory();
  const { isHistoryImageGenerationEnabled, toggleHistoryImageGeneration } = useToggleHistoryImageGeneration();

  const edits = useDocHistoryEdits();

  const selectedEdit: HistoryDocRecord = {
    edit_id: 0,
    id: "example_id",
    timestamp: Date.now() - 60000, // 1 minute ago
    change: "example_change",
    parent: 0,
    preview: new Blob([], { type: "text/html" }),
    workspaceId: "example_workspace_id",
  };

  const finalizeRestore = (md: string) => {
    console.log("Finalizing restore with md:", md);
  };

  const resetAndRestore = async () => {
    console.log("Resetting and restoring");
  };

  const clearAll = async () => {
    console.log("Clearing all history");
  };

  const setEdit = async (edit: HistoryDocRecord) => {
    console.log("Setting edit:", edit);
  };

  const rebaseHistory = (md: string) => {
    console.log("Rebasing history with md:", md);
  };

  const triggerSave = () => {
    console.log("Triggering save");
  };

  const isRestoreState = false;

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
    <EditHistoryMenuDisabled />;
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
          <HistoryMenuToolbar
            edits={[]}
            clearAll={clearAll}
            toggleEditHistory={toggleEditHistory}
            setOpen={setOpen}
            isHistoryImageGenerationEnabled={false}
            toggleHistoryImageGeneration={toggleHistoryImageGeneration}
          />

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
                    className={cn("p-1 py-2 h-auto cursor-pointer focus:bg-sidebar-accent", {
                      "bg-sidebar-accent": selectedEdit && selectedEdit.edit_id === EDIT.edit_id,
                    })}
                  >
                    <div className={cn("text-sm flex w-full items-center justify-start text-left")}>
                      {workspaceId && filePath && isHistoryImageGenerationEnabled ? (
                        <EditViewImage className="w-12 h-12" workspaceId={workspaceId} edit={EDIT} />
                      ) : null}
                      <div className={"ml-4"}>
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
          <Button onClick={finalizeAndRestore}>OK</Button>
          <Button onClick={resetAndRestore}>CANCEL</Button>
        </>
      )}
    </div>
  );
}

function HistoryMenuToolbar({
  edits = [],
  clearAll = async () => {},
  toggleEditHistory = () => {},
  isHistoryImageGenerationEnabled = false,
  toggleHistoryImageGeneration = () => {},
  setOpen = (open: boolean) => {},
}: {
  edits: HistoryDocRecord[];
  clearAll: () => Promise<void>;
  toggleEditHistory: () => void;
  isHistoryImageGenerationEnabled: boolean;
  toggleHistoryImageGeneration: () => void;
  setOpen: (open: boolean) => void;
}) {
  return (
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
        <X className="w-3 h-3" strokeWidth={4} />
        disable
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
            disable preview
          </>
        ) : (
          <>
            <Check className="w-3 h-3" strokeWidth={4} />
            enable preview
          </>
        )}
      </Button>
    </div>
  );
}

function EditHistoryMenuDisabled() {
  return (
    <div className="relative flex items-center pl-1 gap-2 font-mono text-sm opacity-50 mr-1">
      <DropdownMenu open={false} onOpenChange={() => {}}>
        <DropdownMenuTrigger asChild>
          <button
            tabIndex={0}
            className="mr-1 h-8 bg-primary-foreground text-primary cursor-pointer flex rounded-md border border-primary items-center p-1"
            title="Edit History (disabled)"
            aria-label="Edit History (disabled)"
          >
            <div className=" mr-2 flex items-center space-x-2">
              <span className="whitespace-nowrap flex justify-start items-center gap-2 pl-2">
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
                // toggleEditHistory();
                // setOpen(false);
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
