import { HistoryDAO } from "@/data/dao/HistoryDOA";
import { ClientDb } from "@/data/instance";
import { HistoryDB } from "@/editors/history/HistoryDB";
import { useResource } from "@/hooks/useResource";
import { useCurrentFilepath, useWorkspaceContext, useWorkspaceRoute } from "@/workspace/WorkspaceContext";
import { liveQuery } from "dexie";
import pDebounce from "p-debounce";
import { createContext, useContext, useState, useSyncExternalStore } from "react";
import { ActorRefFrom, assign, createMachine, interpret } from "xstate";

export class HistoryPluginx {
  actor: ActorRefFrom<typeof historyMachine>;
  editStorage = new HistoryDB();

  private documentId: string | null = null;
  private workspaceId: string | null = null;
  private dbUnsub: (() => void) | null = null;
  private setEditorMarkdown: (doc: string) => void = () => {};
  private writeMarkdown: (doc: string) => void = () => {};

  constructor({ documentId, workspaceId }: { documentId?: string | null; workspaceId?: string | null } = {}) {
    this.actor = interpret(historyMachine);
    this.actor.start();
    this.setDocument({ documentId, workspaceId });
  }

  // Core business logic methods
  propose = async (edit: HistoryDAO) => {
    const editText = await this.editStorage.reconstructDocument(edit);
    this.setEditorMarkdown(editText);
    this.actor.send({ type: "PROPOSE_EDIT", edit, proposedDoc: editText });
  };

  accept = async () => {
    const proposedDoc = this.actor.getSnapshot().context.proposedDoc!;
    this.writeMarkdown(proposedDoc);
    this.actor.send({ type: "ACCEPT_PROPOSAL" });
  };

  restore = () => {
    const baseDoc = this.actor.getSnapshot().context.baseDoc!;
    this.setEditorMarkdown(baseDoc);
    this.actor.send({ type: "CANCEL_PROPOSAL" });
  };

  clearAll = () => {
    if (!this.documentId) return;
    return this.editStorage.clearAllEdits(this.documentId);
  };

  // Editor integration hooks
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
      this.actor.send({ type: "EXTERNAL_CONTENT_CHANGED", doc: markdownSync });
    }
    if (setEditorMarkdown) this.setEditorMarkdown = setEditorMarkdown;
    if (writeMarkdown) this.writeMarkdown = writeMarkdown;
  };

  saveEdit = pDebounce(async (markdown: string, prevMarkdown?: string | null) => {
    this.actor.send({ type: "UPDATE_EDITOR_DOC", doc: markdown });

    // Auto-backoff if user edits during proposal mode
    const state = this.actor.getSnapshot();
    if (state.value === "proposing" && state.context.proposedDoc !== markdown) {
      this.actor.send({ type: "CONTENT_CHANGED", doc: markdown });
    }

    if (!this.documentId || !this.workspaceId) return;

    return this.editStorage.saveEdit({
      documentId: this.documentId,
      workspaceId: this.workspaceId,
      markdown,
      prevMarkdown,
    });
  }, 2000);

  // Document management
  setDocument = ({ documentId, workspaceId }: { documentId?: string | null; workspaceId?: string | null }) => {
    this.tearDown();
    if (!documentId || !workspaceId) return;

    this.documentId = documentId;
    this.workspaceId = workspaceId;
    this.editStorage = new HistoryDB();

    // Subscribe to database changes
    this.dbUnsub = liveQuery(() =>
      ClientDb.historyDocs.where({ id: documentId, workspaceId }).reverse().sortBy("timestamp")
    ).subscribe((edits) => {
      this.actor.send({ type: "UPDATE_EDITS", edits });
    }).unsubscribe;
  };

  tearDown = () => {
    this.dbUnsub?.();
    this.editStorage.tearDown();
    this.actor.stop();
  };
}

// React hook for the XState machine
export function useHistoryPluginx(
  historyPlugin: HistoryPluginx,
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
  // Hook up the editor callbacks
  historyPlugin.hook({ markdownSync, setEditorMarkdown, writeMarkdown });

  // Subscribe to state changes
  const state = useSyncExternalStore(
    (callback) => historyPlugin.actor.subscribe(callback).unsubscribe,
    () => historyPlugin.actor.getSnapshot()
  );

  return {
    // State
    mode: state.value as "edit" | "propose",
    context: state.context,
    edits: state.context.edits,
    edit: state.context.edit,
    pending: state.context.pending,

    // Actions
    propose: historyPlugin.propose,
    accept: historyPlugin.accept,
    restore: historyPlugin.restore,
    clearAll: historyPlugin.clearAll,

    // State machine
    send: historyPlugin.actor.send,
    state,
  };
}

// XState-based implementation
type HistoryContext = {
  editorDoc: string | null;
  baseDoc: string | null;
  proposedDoc: string | null;
  edit: HistoryDAO | null;
  edits: HistoryDAO[];
  pending: boolean;
};

const historyMachine = createMachine(
  {
    id: "history",
    initial: "editing",
    context: {
      editorDoc: null,
      baseDoc: null,
      proposedDoc: null,
      edit: null,
      edits: [],
      pending: false,
    } as HistoryContext,
    states: {
      editing: {
        on: {
          PROPOSE_EDIT: {
            target: "proposing",
            actions: "setProposal",
          },
          UPDATE_EDITS: {
            actions: "updateEdits",
          },
          UPDATE_EDITOR_DOC: {
            actions: "updateEditorDoc",
          },
          EXTERNAL_CONTENT_CHANGED: {
            actions: "updateBaseDoc",
          },
          SET_PENDING: {
            actions: "setPending",
          },
        },
      },
      proposing: {
        on: {
          ACCEPT_PROPOSAL: {
            target: "editing",
            actions: "acceptProposal",
          },
          CANCEL_PROPOSAL: {
            target: "editing",
            actions: "cancelProposal",
          },
          CONTENT_CHANGED: {
            target: "editing",
            actions: "backoffProposal",
            guard: "contentDiffersFromProposed",
          },
          EXTERNAL_CONTENT_CHANGED: {
            target: "editing",
            actions: "backoffProposal",
          },
        },
      },
    },
  },
  {
    actions: {
      setProposal: assign({
        edit: ({ event }) => event.edit,
        proposedDoc: ({ event }) => event.proposedDoc,
        editorDoc: ({ event }) => event.proposedDoc,
      }),
      acceptProposal: assign({
        baseDoc: ({ context }) => context.proposedDoc,
        editorDoc: ({ context }) => context.proposedDoc,
        edit: null,
        proposedDoc: null,
      }),
      cancelProposal: assign({
        editorDoc: ({ context }) => context.baseDoc,
        edit: null,
        proposedDoc: null,
      }),
      backoffProposal: assign({
        edit: null,
        proposedDoc: null,
      }),
      updateEdits: assign({
        edits: ({ event }) => event.edits,
      }),
      updateEditorDoc: assign({
        editorDoc: ({ event }) => event.doc,
      }),
      updateBaseDoc: assign({
        baseDoc: ({ event }) => event.doc,
        editorDoc: ({ event }) => event.doc,
      }),
      setPending: assign({
        pending: ({ event }) => event.pending,
      }),
    },
    guards: {
      contentDiffersFromProposed: ({ context, event }) => {
        return context.proposedDoc !== event.doc;
      },
    },
  }
);

// XState-based provider
const defaultDocHistoryx = {
  DocHistory: new HistoryPluginx(),
  historyEnabled: false,
  setHistoryEnabled: (enabled: boolean) => {},
};

const DocHistoryContextx = createContext(defaultDocHistoryx);

export function DocHistoryProviderx({ children }: { children: React.ReactNode }) {
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const { path } = useWorkspaceRoute();
  const { isMarkdown } = useCurrentFilepath();
  const { currentWorkspace } = useWorkspaceContext();

  const docHistory = useResource(
    () =>
      new HistoryPluginx({
        documentId: path,
        workspaceId: currentWorkspace.id,
      }),
    [path, currentWorkspace.id]
  );

  if (!isMarkdown) return children;

  return (
    <DocHistoryContextx.Provider
      value={{
        DocHistory: docHistory,
        historyEnabled,
        setHistoryEnabled,
      }}
    >
      {children}
    </DocHistoryContextx.Provider>
  );
}

export function useDocHistoryContextx() {
  const context = useContext<typeof defaultDocHistoryx>(DocHistoryContextx);
  if (!context) {
    throw new Error("useDocHistoryContextx must be used within a DocHistoryProviderx");
  }
  return context;
}
