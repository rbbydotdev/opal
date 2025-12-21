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
import { useDocHistory, useDocHistoryEdits } from "@/editor/history/HistoryPlugin3";
import { useSelectedItemScroll } from "@/editor/history/useSelectedItemScroll";
import { useTimeAgoUpdater } from "@/hooks/useTimeAgoUpdater";
import { cn } from "@/lib/utils";
import { useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { Check, CheckCircle2, ChevronDown, Circle, Clock, History } from "lucide-react";
import { Fragment, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { timeAgo } from "short-time-ago";

function HistoryStatus({ selectedEdit, pending }: { selectedEdit: HistoryDocRecord | null; pending: boolean }) {
  if (selectedEdit !== null || pending) {
    return (
      <div key={selectedEdit?.edit_id} className="animate-spin animation-iteration-once ">
        <History size={20} className="-scale-x-100 inline-block !text-ring" />
      </div>
    );
  }
  return (
    <div>
      <History size={20} className="-scale-x-100 inline-block !text-primary group-hover:!text-ring" />
    </div>
  );
}

export function EditHistoryMenu({
  editorMarkdown,
  setEditorMarkdown,
}: {
  editorMarkdown: string | null;
  setEditorMarkdown: (md: string) => void;
}) {
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceId = currentWorkspace.id; // Use the stable workspace GUID, not the name
  const { path: filePath } = useWorkspaceRoute();
  const disabled = false;
  const [isOpen, setOpen] = useState(false);
  const { updateSelectedItemRef, scrollAreaRef } = useSelectedItemScroll({ isOpen });
  // const { updateImmediate } = useFileContents({
  //   currentWorkspace,
  //   path: filePath,
  // });
  /////////// Mode: "edit" | "propose"
  const [selectedEdit, selectEdit] = useState<HistoryDocRecord | null>(null);
  const [mode, setMode] = useState<"edit" | "propose">("edit");
  const baseContent = useRef(editorMarkdown);
  const proposedContent = useRef<string | null>(null);
  if (baseContent.current === null) baseContent.current = editorMarkdown;

  const { docHistory } = useDocHistory();
  const pending = useSyncExternalStore(docHistory.onChangeIncoming, docHistory.getChangeIncoming);

  const isSelectedEdit = (edit: HistoryDocRecord) => {
    return selectedEdit !== null && selectedEdit.edit_id === edit.edit_id;
  };

  const restore = useCallback(
    (oldText: string) => {
      flushSync(() => {
        setMode("edit");
        selectEdit(null);
        setEditorMarkdown(oldText);
        proposedContent.current = null;
      });
    },
    [setEditorMarkdown]
  );

  const clearHistory = useCallback(async () => {
    if (selectedEdit) {
      await restore(baseContent.current!);
    }
    await docHistory.clearAll();
  }, [docHistory, restore, selectedEdit]);
  const accept = useCallback(
    async (newText: string) => {
      await docHistory.transaction(async () => {
        await flushSync(async () => {
          setMode("edit");
          selectEdit(null);
          proposedContent.current = null;
          baseContent.current = newText;
        });
      });
    },
    [docHistory]
  );
  const propose = useCallback(
    async (edit: HistoryDocRecord) => {
      await docHistory.transaction(async () => {
        await flushSync(async () => {
          const editText = await docHistory.getTextForEdit(edit);
          setMode("propose");
          proposedContent.current = editText;
          selectEdit(edit);
          setEditorMarkdown(editText);
        });
      });
    },
    [docHistory, setEditorMarkdown]
  );

  useEffect(() => {
    //markdown has changed externally while in propose mode
    if (editorMarkdown !== null && mode === "propose" && proposedContent.current !== editorMarkdown) {
      setMode("edit");
      selectEdit(null);
      proposedContent.current = null;
      baseContent.current = editorMarkdown;
    }
  }, [editorMarkdown, mode]);

  /////////

  const edits = useDocHistoryEdits();

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
          <button
            onClick={() => {}}
            className="fill-primary-foreground text-4xl leading-4 group hover:scale-125 active:scale-100 transform transition-all duration-150 pl-1"
          >
            <HistoryStatus selectedEdit={selectedEdit} pending={pending} />
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
          <HistoryMenuToolbar edits={edits} clearAll={clearHistory} setOpen={setOpen} />

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
              {edits.map((edit, index) => (
                <Fragment key={edit.edit_id}>
                  <DropdownMenuItem
                    ref={isSelectedEdit(edit) ? updateSelectedItemRef : null}
                    onSelect={() => propose(edit)}
                    className={cn("p-1 py-2 h-auto cursor-pointer focus:bg-sidebar-accent", {
                      "bg-sidebar-accent": isSelectedEdit(edit),
                    })}
                  >
                    <div className={cn("text-sm flex w-full items-center justify-start text-left")}>
                      <EditViewImage className="w-12 h-12" workspaceId={workspaceId} edit={edit} />
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
                  {index < edits.length - 1 && <Separator />}
                </Fragment>
              ))}
            </div>
          </ScrollAreaViewportRef>
        </DropdownMenuContent>
      </DropdownMenu>

      {mode === "propose" && (
        <>
          <Button onClick={() => accept(editorMarkdown ?? "")}>OK</Button>
          <Button onClick={() => restore(baseContent.current!)} variant="outline">
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
  edits: HistoryDocRecord[];
  clearAll: () => Promise<void>;
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
