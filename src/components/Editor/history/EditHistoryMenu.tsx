// EditHistoryMenu.tsx;
// import { HistoryDocRecord } from "@/components/Editor/history/HistoryDB";
import { EditViewImage } from "@/components/Editor/history/EditViewImage";
import { useEditHistoryPlugin } from "@/components/Editor/history/useEditHistory";
import { MainEditorRealmId } from "@/components/Editor/MainEditorRealmId";
import { ScrollAreaViewportRef } from "@/components/ui/scroll-area-viewport-ref";
import { Separator } from "@/components/ui/separator";
import { useWorkspaceRoute } from "@/context/WorkspaceHooks";
import { HistoryDocRecord } from "@/Db/HistoryDAO";
import { cn } from "@/lib/utils";
import { useRemoteMDXEditorRealm } from "@mdxeditor/editor";
import { Slot } from "@radix-ui/react-slot";
import { ChevronDown, History } from "lucide-react";
import { RefObject, useEffect, useRef, useState } from "react";
import { timeAgo } from "short-time-ago";

export function EditHistoryMenu({
  realmId = MainEditorRealmId,
  finalizeRestore,
}: {
  realmId?: string;
  finalizeRestore: (md: string) => void;
}) {
  const realm = useRemoteMDXEditorRealm(realmId);
  const { edits, selectedEdit, setEdit, reset, clearAll, isRestoreState, selectedEditMd } = useEditHistoryPlugin(realm);
  const [timeAgoStr, setTimeAgoStr] = useState("");
  useEffect(() => {
    const updateTimeAgo = () => {
      if (selectedEdit === null) return setTimeAgoStr("");
      setTimeAgoStr(timeAgo(new Date(selectedEdit.timestamp)));
    };
    const intervalTimer = setInterval(updateTimeAgo, 1000);
    updateTimeAgo();

    return () => clearInterval(intervalTimer);
  }, [edits, selectedEdit]);

  return (
    <div className="relative flex items-center bg-primary-foreground py-1 pl-2 gap-2 font-mono text-sm">
      <EditHistoryScroll select={setEdit} clearAll={clearAll} edits={edits} selectedEdit={selectedEdit}>
        <button tabIndex={0} className="cursor-pointer flex rounded-md border border-primary items-center p-1">
          <div className="mr-2 flex items-center space-x-2 ">
            <span className="fill-primary-foreground stroke-success-darker text-4xl" style={{ lineHeight: "1rem" }}>
              {selectedEdit !== null && (
                <div key={selectedEdit.edit_id} className="animate-spin animation-iteration-once ">
                  <History className="-scale-x-100 inline-block text-ring" />
                </div>
              )}
            </span>
            <span>Edit history {timeAgoStr}</span>
          </div>
          <ChevronDown />
        </button>
      </EditHistoryScroll>
      {isRestoreState && (
        <>
          <button
            onClick={() => {
              finalizeRestore(selectedEditMd!);
              setEdit(null);
            }}
            className="font-bold rounded-xl text-xs border-2 bg-primary-foreground p-2 text-primary border-ring hover:bg-primary hover:text-primary-foreground"
          >
            OK
          </button>
          <button
            onClick={() => {
              reset();
            }}
            className="font-bold rounded-xl text-xs border-2 bg-primary-foreground p-2 text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground"
          >
            CANCEL
          </button>
        </>
      )}
    </div>
  );
}

function scrollSelectedItemIntoView(
  selectedItemRef: RefObject<HTMLSpanElement | null>,
  viewportRef: RefObject<HTMLDivElement | null>
) {
  if (selectedItemRef?.current && viewportRef?.current) {
    const selectedItemRect = selectedItemRef.current.getBoundingClientRect();
    const offsetTop = selectedItemRef.current.offsetTop;
    const itemHeight = selectedItemRect.height;
    const viewportHeight = viewportRef.current.clientHeight;
    const scrollTo = offsetTop - viewportHeight / 2 + itemHeight / 2;
    viewportRef.current.scrollTop = Math.max(0, Math.min(scrollTo, viewportRef.current.scrollHeight - viewportHeight));
  }
}

function EditHistoryScroll({
  children,
  select,
  edits,
  clearAll,
  selectedEdit,
}: {
  children: React.ReactElement;
  select: (edit: HistoryDocRecord) => void;
  edits: HistoryDocRecord[];
  clearAll: () => void;
  selectedEdit: HistoryDocRecord | null;
}) {
  const [isOpen, setOpen] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { id: workspaceId, path: filePath } = useWorkspaceRoute();

  const handleClick = () => {
    setOpen(!isOpen);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      document.addEventListener("click", handleClickOutside);
    } else {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClickOutside);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollSelectedItemIntoView(selectedItemRef!, viewportRef);
    }
  }, [isOpen]);

  return (
    <div ref={menuRef}>
      <Slot onClick={handleClick}>{children}</Slot>
      {isOpen && (
        <div className="absolute left-0 z-10 mt-2">
          <ScrollAreaViewportRef
            viewportRef={viewportRef}
            className={cn(
              { "h-96": Boolean(edits.length), "h-18": !Boolean(edits.length) },
              "_w-[420px] w-[900px] rounded-md border bg-primary-foreground text-primary shadow-lg"
            )}
          >
            <div className="p-4">
              {Boolean(edits.length) && (
                <div className="mb-4 text-sm font-medium leading-none">
                  <button
                    onClick={() => {
                      clearAll();
                      setOpen(false);
                    }}
                    className="ml-2 rounded-xl border-2 bg-primary p-2 text-primary-foreground hover:border-primary hover:bg-primary-foreground hover:text-primary"
                  >
                    clear all
                  </button>
                </div>
              )}
              {edits.length === 0 && (
                <div className="flex h-full flex-col gap-4">
                  edits:
                  <div className="border-muted-foreground flex justify-center text-sm text-muted-foreground border border-dashed p-2">
                    empty
                  </div>
                </div>
              )}
              {/* <SnapApiPoolProvider max={Math.max((navigator?.hardwareConcurrency ?? 0) - 1 || 2)}> */}
              {edits.map((EDIT) => (
                <div key={EDIT.edit_id}>
                  <button
                    tabIndex={0}
                    onClick={() => {
                      setOpen(false);
                      select(EDIT);
                    }}
                    className={cn(
                      { "bg-sidebar-accent": selectedEdit && selectedEdit.edit_id === EDIT.edit_id },
                      "hover:bg-sidebar-accent flex w-full items-center justify-start p-1 py-2 text-left text-sm hover:bg-tool focus:outline-none"
                    )}
                  >
                    {workspaceId && filePath ? <EditViewImage workspaceId={workspaceId} edit={EDIT} /> : null}
                    <div className="ml-4">
                      {!selectedEdit || selectedEdit.edit_id !== EDIT.edit_id ? (
                        <span className="mr-2 text-primary">{"•"}</span>
                      ) : (
                        <span ref={selectedItemRef} className="-ml-1 mr-2 text-2xl font-bold text-ring">
                          {"✓"}
                        </span>
                      )}

                      {new Date(EDIT.timestamp).toLocaleString()}
                      <span className="text-black">
                        &nbsp;
                        {/* <span className="font-bold font-mono ml-4">{EDIT.edit_id}</span>{" "} */}
                        <span>{`- ${timeAgo(new Date(EDIT.timestamp))}`}</span>
                      </span>
                    </div>
                  </button>
                  <Separator />
                </div>
              ))}
            </div>
          </ScrollAreaViewportRef>
        </div>
      )}
    </div>
  );
}
