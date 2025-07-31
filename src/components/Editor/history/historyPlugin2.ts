import { MdxEditorSelector } from "@/components/Editor/EditorConst";
import { HistoryDocRecord, HistoryStorageInterface } from "@/Db/HistoryDAO";
import { debounce } from "@/lib/debounce";
import { Mutex } from "async-mutex";
import EventEmitter from "events";

const HistoryEvents = {
  INSIDE_MARKDOWN: "inside-markdown",
  OUTSIDE_MARKDOWN: "outside-markdown",
  SELECTED_EDIT: "select-edit",
  SELECTED_EDIT_MD: "selected-edit-md",
  EDITS: "edits",
} as const;

type HistoryEventTypes = typeof HistoryEvents;

class HistoryEventEmmiter extends EventEmitter {
  constructor() {
    super();
  }
  on(event: HistoryEventTypes["EDITS"], callback: (edits: HistoryDocRecord[]) => void): this;
  on(event: HistoryEventTypes["SELECTED_EDIT"], callback: (edit: HistoryDocRecord) => void): this;
  on(event: HistoryEventTypes["SELECTED_EDIT_MD"], callback: (md: string) => void): this;
  on(event: HistoryEventTypes["INSIDE_MARKDOWN"], callback: (md: string) => void): this;
  on(event: HistoryEventTypes["OUTSIDE_MARKDOWN"], callback: (md: string) => void): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, callback: (...args: any[]) => void): this {
    return super.on(event, callback);
  }
}

export class HistoryPlugin2 {
  private events = new HistoryEventEmmiter();
  readonly workspaceId: string;
  readonly documentId: string;
  readonly historyStorage: HistoryStorageInterface;
  private muteChange = false;
  private mutex = new Mutex();
  readonly rootMarkdown: string;
  private latestMarkdown: string = "";
  private selectedEditMd: string | null = null;
  private selectedEdit: HistoryDocRecord | null = null;
  private saveThreshold = 0.7;
  private debounceMs = 5_000;
  private edits: HistoryDocRecord[] = [];

  set $edits(edits: HistoryDocRecord[]) {
    this.edits = edits;
    this.events.emit(HistoryEvents.EDITS, edits);
  }
  set $selectedEdit(edit: HistoryDocRecord | null) {
    this.selectedEdit = edit;
    this.events.emit(HistoryEvents.SELECTED_EDIT, edit);
  }
  set $latestMarkdown(md: string) {
    this.latestMarkdown = md;
    this.events.emit(HistoryEvents.INSIDE_MARKDOWN, md);
  }
  set $selectedEditMd(md: string | null) {
    this.selectedEditMd = md;
    this.events.emit(HistoryEvents.SELECTED_EDIT_MD, md);
  }

  constructor({
    workspaceId,
    documentId,
    historyStorage,
    rootMarkdown,
  }: {
    workspaceId: string;
    documentId: string;
    historyStorage: HistoryStorageInterface;
    rootMarkdown: string;
  }) {
    this.workspaceId = workspaceId;
    this.documentId = documentId;
    this.historyStorage = historyStorage;
    this.rootMarkdown = rootMarkdown;
    this.latestMarkdown = rootMarkdown;
    this.selectedEditMd = rootMarkdown;
  }
  getState = () => {
    return {
      edits: this.edits,
      selectedEdit: this.selectedEdit,
      selectedEditMd: this.selectedEditMd,
    };
  };
  // state:
  onStateUpdate = (cb: () => void) => {
    this.events.on(HistoryEvents.EDITS, cb);
    this.events.on(HistoryEvents.SELECTED_EDIT, cb);
    this.events.on(HistoryEvents.SELECTED_EDIT_MD, cb);
    return () => {
      this.events.off(HistoryEvents.EDITS, cb);
      this.events.off(HistoryEvents.SELECTED_EDIT, cb);
      this.events.off(HistoryEvents.SELECTED_EDIT_MD, cb);
    };
  };
  init() {
    void this.historyStorage.getEdits(this.documentId).then(async (edits) => {
      //emit latest edits to start
      this.$edits = edits;
    });

    this.events.on(HistoryEvents.OUTSIDE_MARKDOWN, () => {
      //on editor change de-select edit by setting to null
      if (this.selectedEdit && !this.muteChange) void this.setSelectedEdit(null);
    });

    const debouncedMdUpdate = debounce(async (md: string) => {
      const saveScore = await this.historyStorage.getSaveThreshold(this.documentId, md);
      if (saveScore < this.saveThreshold) {
        return console.debug(`Skipping save for ${this.documentId} due to low score: ${saveScore}`);
      }
      return this.saveNewEdit(md);
    }, this.debounceMs);
    this.events.on(HistoryEvents.OUTSIDE_MARKDOWN, (md) => {
      //attempt to determine the editor change was done by the user
      const editorInFocus = Boolean(document.activeElement?.closest(MdxEditorSelector));
      if (!this.muteChange && editorInFocus) debouncedMdUpdate(md);
    });
  }
  async setSelectedEdit(edit: HistoryDocRecord | null) {
    await this.transaction(async () => {
      this.selectedEdit = edit;
      if (edit) {
        const editDoc = await this.historyStorage.reconstructDocumentFromEdit(edit);
        if (typeof editDoc !== "string") {
          console.error("Reconstructed history document is not a string");
          return;
        }
        this.$latestMarkdown = editDoc;
        this.$selectedEditMd = editDoc;
      } else {
        this.$selectedEditMd = null;
      }
      this.$selectedEdit = edit;
    });
  }

  teardown() {
    this.events.removeAllListeners();
  }

  private async saveNewEdit(newMarkdown: string) {
    const edits = await this.historyStorage.getEdits(this.documentId);
    if (!edits.length) {
      // If there are no edits yet, we can save the initial state as the first edit
      const newEdit = await this.historyStorage.saveEdit(this.workspaceId, this.documentId, this.latestMarkdown);
      if (newEdit) {
        edits.push(newEdit); //Assuming ascending
        this.$edits = edits;
      } else {
        console.error("Failed to save initial edit");
      }
    }
    this.latestMarkdown = newMarkdown; //not $latestMarkdown to avoid loop
    const headEdit = edits[0];
    if (headEdit) {
      if ((await this.historyStorage.reconstructDocumentFromEdit(headEdit)) === newMarkdown) {
        return console.debug("Skipping redundant edit save");
      }
    }
    const newEdit = await this.historyStorage.saveEdit(this.workspaceId, this.documentId, newMarkdown);
    if (newEdit) {
      edits.push(newEdit);
      this.$edits = edits;
    } else {
      console.error("Failed to save new edit");
    }
  }

  clearAll() {
    return this.transaction(async () => {
      await this.historyStorage.clearAllEdits(this.documentId);
      this.$edits = [];
      return this.resetToStartingMarkdown();
    });
  }

  private resetToStartingMarkdown() {
    //for the edit to go from from edit markdown to latest markdown
    return this.transaction(() => {
      this.events.emit(HistoryEvents.INSIDE_MARKDOWN, this.latestMarkdown);
    });
  }
  async reset() {
    await this.resetToStartingMarkdown();
    return this.setSelectedEdit(null);
  }

  private async transaction(fn: () => void) {
    return this.mutex.runExclusive(async () => {
      this.muteChange = true;
      await fn();
      this.muteChange = false;
    });
  }

  triggerSave() {
    return this.transaction(async () => {
      const latestMarkdown = this.latestMarkdown;
      if (latestMarkdown) {
        await this.saveNewEdit(latestMarkdown);
      } else {
        console.warn("No latest markdown to save");
      }
    });
  }
  setMarkdown(md: string) {
    this.events.emit(HistoryEvents.OUTSIDE_MARKDOWN, md);
  }
  handleMarkdown(callback: (md: string) => void) {
    this.events.on(HistoryEvents.INSIDE_MARKDOWN, callback);
  }
  handleSelectedEdit(callback: (edit: HistoryDocRecord | null) => void) {
    this.events.on(HistoryEvents.SELECTED_EDIT, callback);
  }
}
