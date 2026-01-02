// EditHistoryMenu.tsx;
import { useConfirm } from "@/components/ConfirmContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollAreaViewportRef } from "@/components/ui/scroll-area-viewport-ref";
import { Separator } from "@/components/ui/separator";
import { HistoryDAO } from "@/data/dao/HistoryDOA";
import { EditViewPreview } from "@/editors/history/EditViewPreview";
import { useDocHistory } from "@/editors/history/HistoryPlugin";
import { useSelectedItemScroll } from "@/editors/history/useSelectedItemScroll";
import { useLocalStorage } from "@/features/local-storage/useLocalStorage";
import { useTimeAgoUpdater } from "@/hooks/useTimeAgoUpdater";
import { cn } from "@/lib/utils";
import { useWorkspaceContext } from "@/workspace/WorkspaceContext";
import { Check, CheckCircle2, ChevronDown, Circle, Clock, History } from "lucide-react";
import { Fragment, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { timeAgo } from "short-time-ago";

function useEnabledEditHistory() {
  return useLocalStorage("EditHistoryMenu/enabled", true);
}

function VirtualizedEditList({
  edits,
  workspaceId,
  workspaceName,
  selectedEdit,
  isSelectedEdit,
  propose,
  updateSelectedItemRef,
  scrollAreaRef,
}: {
  edits: readonly HistoryDAO[];
  workspaceId: string;
  workspaceName: string;
  selectedEdit: HistoryDAO | null;
  isSelectedEdit: (edit: HistoryDAO) => boolean;
  propose: (edit: HistoryDAO) => void;
  updateSelectedItemRef: ((node: HTMLDivElement | null) => void) | null;
  scrollAreaRef: React.MutableRefObject<HTMLElement | null>;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: edits.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70,
    overscan: 3,
  });

  if (parentRef.current) {
    scrollAreaRef.current = parentRef.current;
  }

  if (edits.length === 0) {
    return (
      <div className="h-18">
        <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
          <div className="w-full flex justify-center items-center border-muted-foreground text-sm text-muted-foreground border border-dashed p-2">
            empty
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-96 overflow-auto"
      style={{
        contain: 'layout style',
      }}
    >
      <div className="p-1 font-mono">
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const edit = edits[virtualItem.index];
            if (!edit) return null;

            const isLast = virtualItem.index === edits.length - 1;

            return (
              <div
                key={edit.edit_id}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <DropdownMenuItem
                  ref={isSelectedEdit(edit) ? updateSelectedItemRef : null}
                  onSelect={() => propose(edit)}
                  className={cn("p-1 py-2 h-auto cursor-pointer focus:bg-sidebar-accent", {
                    "bg-sidebar-accent": isSelectedEdit(edit),
                  })}
                >
                  <div className={cn("text-sm flex w-full items-center justify-start text-left")}>
                    <EditViewPreview
                      className="w-12 h-12"
                      workspaceId={workspaceId}
                      workspaceName={workspaceName}
                      edit={edit}
                    />
                    <div className={"ml-4"}>
                      {isSelectedEdit(edit) ? (
                        <CheckCircle2 className="inline-block mr-2 text-ring" size={16} strokeWidth={2} />
                      ) : (
                        <Circle className="inline-block mr-2 text-primary" size={16} strokeWidth={2} />
                      )}
                      {new Date(edit.timestamp).toLocaleString()}
                      <span className="pl-2 text-primary">{`- ${timeAgo(new Date(edit.timestamp))}`}</span>
                    </div>
                  </div>
                </DropdownMenuItem>
                {!isLast && <Separator />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HistoryStatus({ selectedEdit, pending }: { selectedEdit: HistoryDAO | null; pending: boolean }) {
  if (selectedEdit !== null || pending) {
    return (
      <div key={selectedEdit?.edit_id} className="animate-pulse animation-iteration-once ">
        <History size={20} className="-scale-x-100 inline-block !text-primary" />
      </div>
    );
  }
  return (
    <div>
      <History size={20} className="-scale-x-100 inline-block !text-secondary" />
    </div>
  );
}

export function EditHistoryMenu() {
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceId = currentWorkspace.id; // Use the stable workspace GUID, not the name
  const workspaceName = currentWorkspace.name; // Add workspace name for the endpoint
  const { storedValue: enabled } = useEnabledEditHistory();
  const [isOpen, setOpen] = useState(false);

  const { updateSelectedItemRef, scrollAreaRef } = useSelectedItemScroll({ isOpen });

  const { edits, pending, mode, edit: selectedEdit, accept, propose, restore, clearAll } = useDocHistory();
  const isSelectedEdit = (edit: HistoryDAO) => {
    return selectedEdit !== null && selectedEdit.edit_id === edit.edit_id;
  };

  const timeAgoStr = useTimeAgoUpdater({ date: selectedEdit?.timestamp ? new Date(selectedEdit?.timestamp) : null });

  if (!enabled) {
    <EditHistoryMenuDisabled />;
  }
  return (
    <div
      className={cn("relative flex items-center pl-2 gap-2 font-mono text-sm mx-2", {
        "opacity-50": !enabled,
      })}
      data-component="EditHistoryMenu"
    >
      <DropdownMenu open={isOpen} onOpenChange={setOpen}>
        <div className="h-full absolute left-4 flex justify-center items-center">
          <button
            onClick={() => {}}
            className="text-primary text-4xl leading-4 group hover:scale-125 active:scale-100 transform transition-all duration-150 pl-1"
          >
            <HistoryStatus selectedEdit={selectedEdit} pending={pending} />
          </button>
        </div>
        <DropdownMenuTrigger asChild disabled={!enabled}>
          <Button
            tabIndex={0}
            className="mx-1 h-8 flex items-center p-1"
            title={"Edit History" + (edits.length ? ` (${edits.length} edits)` : "")}
          >
            <div className="pl-8 mr-2 flex items-center space-x-2 ">
              <span className="whitespace-nowrap">Edit history {timeAgoStr}</span>
            </div>
            <ChevronDown size={12} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[37.5rem] bg-background p-0"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <HistoryMenuToolbar edits={edits} clearAll={clearAll} setOpen={setOpen} />

          <VirtualizedEditList
            edits={edits}
            workspaceId={workspaceId}
            workspaceName={workspaceName}
            selectedEdit={selectedEdit}
            isSelectedEdit={isSelectedEdit}
            propose={propose}
            updateSelectedItemRef={updateSelectedItemRef}
            scrollAreaRef={scrollAreaRef}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {mode === "propose" && (
        <>
          <Button onClick={accept}>OK</Button>
          <Button onClick={restore} variant="outline">
            CANCEL
          </Button>
        </>
      )}
    </div>
  );
}

function HistoryMenuToolbar({
  edits,
  clearAll = async () => {},
  setOpen = (open: boolean) => {},
}: {
  edits: readonly HistoryDAO[];
  clearAll: () => void;
  setOpen: (open: boolean) => void;
}) {
  const { open: openConfirm } = useConfirm();
  return (
    <div className="border-b border-border p-2 flex gap-2">
      {Boolean(edits.length) ? (
        <Button
          variant={"secondary"}
          size="default"
          onClick={async () => {
            const confirm = await openConfirm(
              () => true,
              "Clear Edit History",
              "Are you sure you want to clear the edit history? This action cannot be undone."
            );
            if (confirm) {
              void clearAll();
              setOpen(false);
            }
          }}
          className="text-left bg-primary border-2 p-2 rounded-xl text-primary-foreground hover:border-primary hover:bg-primary-foreground hover:text-primary"
        >
          clear
        </Button>
      ) : null}
    </div>
  );
}

function EditHistoryMenuDisabled() {
  const { setStoredValue: setEnabled } = useEnabledEditHistory();
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
                setEnabled(true);
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

// const restore = useCallback(
//   (oldText: string) => {
//     flushSync(() => {
//       setMode("edit");
//       selectEdit(null);
//       setEditorMarkdown(oldText);
//       proposedContent.current = null;
//     });
//   },
//   [setEditorMarkdown]
// );

// const accept = useCallback(
//   async (newText: string) => {
//     await docHistory.transaction(async () => {
//       await flushSync(async () => {
//         setMode("edit");
//         selectEdit(null);
//         proposedContent.current = null;
//         baseContent.current = newText;
//       });
//     });
//   },
//   [docHistory]
// );
// const propose = useCallback(
//   async (edit: HistoryDocRecord) => {
//     await docHistory.transaction(async () => {
//       await flushSync(async () => {
//         const editText = await docHistory.getTextForEdit(edit);
//         setMode("propose");
//         proposedContent.current = editText;
//         selectEdit(edit);
//         setEditorMarkdown(editText);
//       });
//     });
//   },
//   [docHistory, setEditorMarkdown]
// );

// const clearHistory = useCallback(async () => {
//   if (selectedEdit) {
//     await restore(baseContent.current!);
//   }
//   await docHistory.clearAll();
// }, [docHistory, restore, selectedEdit]);
