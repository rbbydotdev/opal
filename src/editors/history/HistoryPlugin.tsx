import { HistoryDAO } from "@/data/dao/HistoryDOA";
import { ClientDb } from "@/data/db/DBInstance";
import { HistoryDB } from "@/editors/history/HistoryDB";
import { useResource } from "@/hooks/useResource";
import pDebounce from "p-debounce";

import { useCurrentFilepath, useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { liveQuery } from "dexie";
import { createContext, useContext, useState } from "react";
import { proxy, subscribe, useSnapshot, ref } from "valtio";

export class HistoryPlugin {
  static defaultState = {
    editorDoc: null as string | null,
    baseDoc: null as string | null,
    proposedDoc: null as string | null,
    edit: null as HistoryDAO | null,
    edits: [] as HistoryDAO[],
    mode: "edit" as "edit" | "propose",
    pending: false,
  };

  private debounceMs = 2_000;

  editStorage = new HistoryDB();

  state = proxy({ ...HistoryPlugin.defaultState });

  private documentId: string | null = null;
  private workspaceId: string | null = null;
  private unsubs: Array<() => void> = [];

  private setEditorMarkdown: (doc: string) => void = () => {};
  private writeMarkdown: (doc: string) => void = () => {};

  resetStore = ({ quiet = false }: { quiet?: boolean } = {}) => {
    Object.assign(this.state, HistoryPlugin.defaultState);
  };

  constructor({ documentId, workspaceId }: { documentId?: string | null; workspaceId?: string | null } = {}) {
    this.setDocument({ documentId, workspaceId });
  }

  hook = ({
    markdownSync,
    setEditorMarkdown,
    writeMarkdown,
  }: {
    markdownSync: string | null;
    setEditorMarkdown?: (doc: string) => void;
    writeMarkdown?: (doc: string) => void;
  }) => {
    if (typeof markdownSync === "string") {
      if (this.state.baseDoc === null) this.state.baseDoc = markdownSync;

      // Don't sync editorDoc from external editor when in propose mode
      // This prevents the cycle where propose() -> setEditorMarkdown() -> hook() -> backoff()
      if (this.state.mode !== "propose" && this.state.editorDoc !== markdownSync) {
        this.state.editorDoc = markdownSync;
      }
    }
    if (setEditorMarkdown) this.setEditorMarkdown = setEditorMarkdown;
    if (writeMarkdown) this.writeMarkdown = writeMarkdown;
  };

  // Direct state access - no getters/setters needed with valtio

  // Direct state access via valtio proxy - no setters/getters needed

  init() {
    if (!this.documentId || !this.workspaceId) return;
    this.editStorage = new HistoryDB();
    this.unsubs.push(
      ...[
        () => this.editStorage.tearDown(),
        //
        liveQuery(() =>
          ClientDb.historyDocs
            .where({
              id: this.documentId,
              workspaceId: this.workspaceId,
            })
            .reverse()
            .sortBy("timestamp")
        ).subscribe((edits) => {
          this.state.edits = edits.map(edit => edit.preview ? { ...edit, preview: ref(edit.preview) } : edit);
        }).unsubscribe,
        subscribe(this.state, () => {
          const doc = this.state.editorDoc;
          const proposedDoc = this.state.proposedDoc;
          if (this.state.mode === "propose" && proposedDoc !== doc) {
            this.backoff();
          }
        }),
        //
        subscribe(this.state, () => {
          const doc = this.state.editorDoc;
          if (this.state.mode === "edit") {
            this.state.baseDoc = doc;
          }
        }),
      ]
    );
  }

  propose = async (edit: HistoryDAO) => {
    const editText = await this.getTextForEdit(edit);

    // Update state first, then sync to editor
    this.state.mode = "propose";
    this.state.proposedDoc = editText;
    this.state.editorDoc = editText; // Set our internal state
    this.state.edit = edit.preview ? { ...edit, preview: ref(edit.preview) } : edit;

    // Then update the external editor
    this.setEditorMarkdown(editText);
  };
  accept = async () => {
    const proposedDoc = this.state.proposedDoc!;
    this.writeMarkdown(proposedDoc);
    this.state.mode = "edit";
    this.state.edit = null;
    this.state.baseDoc = proposedDoc;
    this.state.proposedDoc = null;
    this.state.editorDoc = proposedDoc;
  };
  restore = () => {
    const baseDoc = this.state.baseDoc!;
    this.setEditorMarkdown(this.state.baseDoc!);
    this.state.mode = "edit";
    this.state.edit = null;
    this.state.proposedDoc = null;
    this.state.editorDoc = baseDoc;
  };
  backoff = () => {
    this.state.mode = "edit";
    this.state.edit = null;
    this.state.proposedDoc = null;
  };

  clearAll = () => {
    if (!this.documentId) return;
    return this.editStorage.clearAllEdits(this.documentId);
  };

  getTextForEdit = this.editStorage.reconstructDocument;

  saveEdit = async (markdown: string, prevMarkdown?: string | null) => {
    this.state.editorDoc = markdown;
    await this.onChangeDebounce(markdown, prevMarkdown);
  };

  setDocument = ({ documentId, workspaceId }: { documentId?: string | null; workspaceId?: string | null }) => {
    this.tearDown();
    if (!documentId || !workspaceId) return;
    if (this.documentId === documentId && this.workspaceId == workspaceId) return;
    this.documentId = documentId;
    this.workspaceId = workspaceId;
    this.init();
  };

  private onChangeDebounce = pDebounce(async (markdown: string, prevMarkdown?: string | null) => {
    if (!this.documentId || !this.workspaceId) return;
    const documentId = this.documentId;
    const workspaceId = this.workspaceId;
    return this.editStorage.saveEdit({
      documentId,
      workspaceId,
      markdown,
      prevMarkdown,
    });
  }, this.debounceMs);

  tearDown = () => {
    while (this.unsubs.length) this.unsubs.pop()!();
  };
}

const defaultDocHistory = {
  DocHistory: new HistoryPlugin(),
  historyEnabled: false,
  setHistoryEnabled: (enabled: boolean) => {},
};

const DocHistoryContext = createContext(defaultDocHistory);

export function DocHistoryProvider({ children }: { children: React.ReactNode }) {
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const { path } = useWorkspaceRoute();
  const { isMarkdown } = useCurrentFilepath();
  const { currentWorkspace } = useWorkspaceContext();

  const docHistory = useResource(
    () =>
      new HistoryPlugin({
        documentId: path,
        workspaceId: currentWorkspace.id,
      }),
    [path, currentWorkspace.id]
  );

  if (!isMarkdown) return children;

  return (
    <DocHistoryContext.Provider
      value={{
        DocHistory: docHistory,
        historyEnabled,
        setHistoryEnabled,
      }}
    >
      {children}
    </DocHistoryContext.Provider>
  );
}
export function useDocHistory(
  {
    markdownSync,
    setEditorMarkdown,
    writeMarkdown,
  }: {
    markdownSync: string | null;
    setEditorMarkdown?: (doc: string) => void;
    writeMarkdown?: (doc: string) => void;
  } = { markdownSync: null }
) {
  const { DocHistory } = useDocHistoryContext();

  DocHistory.hook({
    markdownSync,
    setEditorMarkdown,
    writeMarkdown,
  });

  const state = useSnapshot(DocHistory.state);
  const { edits, pending, mode, edit } = state;

  const { accept, propose, restore, backoff, clearAll } = DocHistory;

  return { DocHistory, accept, propose, restore, backoff, clearAll, edits, pending, mode, edit };
}

export function useDocHistoryContext() {
  const context = useContext<typeof defaultDocHistory>(DocHistoryContext);
  if (!context) {
    throw new Error("useDocHistory must be used within a DocHistoryProvider");
  }
  return context;
}
