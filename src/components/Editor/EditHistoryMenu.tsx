// EditHistoryMenu.tsx;
import { DocumentChange } from "@/components/Editor/HistoryDB";
import { useEditHistoryPlugin } from "@/components/Editor/useEditHistory";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@mdxeditor/editor";
import { ChevronDown, History } from "lucide-react";
import { cloneElement, useEffect, useRef, useState } from "react";
import { timeAgo } from "short-time-ago";

export function EditHistoryMenu({ historyId }: { historyId: string }) {
  const [edits, selectedEdit, setEdit, reset, clearAll] = useEditHistoryPlugin(historyId);

  const [timeAgoStr, setTimeAgoStr] = useState("");
  useEffect(() => {
    const updateTimeAgo = () => {
      if (selectedEdit === null) return setTimeAgoStr("");
      setTimeAgoStr(timeAgo(new Date(selectedEdit.timestamp)));
    };
    const intId = setInterval(updateTimeAgo, 1000);
    updateTimeAgo();

    return () => clearInterval(intId);
  }, [edits, selectedEdit]);

  return (
    <div className="relative mb-2 flex items-center border-2 border-dashed border-primary bg-primary-foreground py-2 pl-6 font-mono text-xl">
      <EditHistoryScroll select={setEdit} reset={reset} clearAll={clearAll} edits={edits} selectedEdit={selectedEdit}>
        <button className="flex w-full items-center">
          <div className="mr-2 flex items-center space-x-2">
            <span>Draft: </span>
            <span className="fill-primary-foreground stroke-success-darker text-4xl" style={{ lineHeight: "1rem" }}>
              {selectedEdit !== null ? <History stroke="current" fill="current" className="inline-block" /> : ""}
            </span>
            <span>Edit history {timeAgoStr}</span>
          </div>
          <ChevronDown />
        </button>
      </EditHistoryScroll>
    </div>
  );
}

function EditHistoryScroll({
  children,
  select,
  edits,
  reset,
  clearAll,
  selectedEdit,
}: {
  children: React.ReactElement;
  select: (edit: DocumentChange) => void;
  edits: DocumentChange[];
  reset: () => void;
  clearAll: () => void;
  selectedEdit: DocumentChange | null;
}) {
  const [isOpen, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div ref={menuRef} className="w-full">
      {cloneElement(children, { onClick: handleClick })}
      {isOpen && (
        <div className="absolute left-0 z-10 mt-2 w-full">
          <ScrollArea className="h-72 w-full rounded-md border bg-primary-foreground text-primary shadow-lg">
            <div className="p-4">
              <h4 className="mb-4 text-sm font-medium leading-none">
                Edits{" "}
                <button
                  onClick={() => {
                    reset();
                    setOpen(false);
                  }}
                  className="ml-2 rounded-xl border-2 bg-primary p-2 text-primary-foreground hover:border-primary hover:bg-primary-foreground hover:text-primary"
                >
                  reset
                </button>
                <button
                  onClick={() => {
                    clearAll();
                    setOpen(false);
                  }}
                  className="ml-2 rounded-xl border-2 bg-primary p-2 text-primary-foreground hover:border-primary hover:bg-primary-foreground hover:text-primary"
                >
                  clear all
                </button>
              </h4>

              {edits.map((edit) => (
                <div key={edit.edit_id}>
                  <button
                    tabIndex={0}
                    onClick={() => {
                      setOpen(false);
                      select(edit);
                    }}
                    className="flex w-full items-center justify-start p-1 py-2 text-left text-sm hover:bg-tool focus:outline-none"
                  >
                    {!selectedEdit || selectedEdit.edit_id !== edit.edit_id ? (
                      <span className="mr-2 text-primary">{"•"}</span>
                    ) : (
                      <span className="-ml-1 mr-2 text-2xl font-bold text-success-darker">{"✓"}</span>
                    )}

                    {new Date(edit.timestamp).toLocaleString()}
                    <span className="text-black">
                      &nbsp;
                      <span>{`- ${timeAgo(new Date(edit.timestamp))}`}</span>
                    </span>
                  </button>
                  <Separator />
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
