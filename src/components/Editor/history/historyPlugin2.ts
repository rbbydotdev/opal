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

type HistoryEventMap = {
  [HistoryEvents.INSIDE_MARKDOWN]: [md: string];
  [HistoryEvents.OUTSIDE_MARKDOWN]: [md: string];
  [HistoryEvents.SELECTED_EDIT_MD]: [md: string | null];
  [HistoryEvents.SELECTED_EDIT]: [edit: HistoryDocRecord | null];
  [HistoryEvents.EDITS]: [edits: HistoryDocRecord[]];
};
class HistoryEventEmitter extends EventEmitter {
  on<K extends keyof HistoryEventMap>(event: K, callback: (...args: HistoryEventMap[K]) => void): this {
    return super.on(event, callback);
  }
  awaitEvent<K extends keyof HistoryEventMap>(event: K): Promise<HistoryEventMap[K]> {
    return new Promise((resolve) => {
      const handler = (...args: HistoryEventMap[K]) => {
        this.off(event, handler);
        resolve(args);
      };
      this.on(event, handler);
    });
  }

  emit<K extends keyof HistoryEventMap>(event: K, ...args: HistoryEventMap[K]): boolean {
    return super.emit(event, ...args);
  }
}

function timeout$(ms: number, warnMsg?: string): [Promise<void>, () => void] {
  let timeoutId: ReturnType<typeof setTimeout>;
  return [
    new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        if (warnMsg) console.warn(warnMsg);
        resolve(void 0);
      }, ms);
    }),
    () => {
      clearTimeout(timeoutId);
    },
  ];
}

export class HistoryPlugin2 {
  private events = new HistoryEventEmitter();
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
  private debounceMs = 2_000;
  private edits: HistoryDocRecord[] = [];

  private eventId = 0;

  set $edits(edits: HistoryDocRecord[]) {
    console.debug(`Setting edits for ${this.documentId}`, edits.length);
    this.eventId++;
    this.edits = edits;
    this.events.emit(HistoryEvents.EDITS, edits);
  }

  set $selectedEdit(edit: HistoryDocRecord | null) {
    console.debug(`Setting selected edit for ${this.documentId}`, edit?.id ?? "null");
    this.eventId++;
    this.selectedEdit = edit;
    this.events.emit(HistoryEvents.SELECTED_EDIT, edit);
  }
  set $selectedEditMd(md: string | null) {
    console.debug(`Setting selected edit markdown for ${this.documentId}`, md?.length ?? "null");
    this.eventId++;
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
    this.selectedEditMd = null;
  }
  private lastState: {
    edits: HistoryDocRecord[];
    selectedEdit: HistoryDocRecord | null;
    selectedEditMd: string | null;
  } | null = null;

  private lastEventId = -1;
  getState = () => {
    if (this.eventId !== this.lastEventId || !this.lastState) {
      this.lastEventId = this.eventId;
      return (this.lastState = {
        edits: this.edits,
        selectedEdit: this.selectedEdit,
        selectedEditMd: this.selectedEditMd,
      });
    }
    return this.lastState;
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
  init = () => {
    void this.historyStorage.getEdits(this.documentId).then(async (edits) => {
      //emit latest edits to start
      this.$edits = edits;
    });
    void this.historyStorage.onUpdate(this.documentId, async (edits) => {
      //watch for latest ids
      this.$edits = edits;
    });

    this.events.on(HistoryEvents.OUTSIDE_MARKDOWN, () => {
      //on editor change de-select edit by setting to null
      if (this.selectedEdit && !this.muteChange) this.clearSelectedEdit();
    });
    this.events.on(HistoryEvents.SELECTED_EDIT_MD, async (md) => {
      if (md !== null) {
        await this.publishMuted(md, false);
      }
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

    return this;
  };
  setSelectedEdit = async (edit: HistoryDocRecord) => {
    const editDoc = await this.historyStorage.reconstructDocumentFromEdit(edit);
    if (typeof editDoc !== "string") {
      console.error("Reconstructed history document is not a string");
      return;
    }
    this.$selectedEdit = edit;
    this.$selectedEditMd = editDoc;
  };

  private async publishMuted(md: string, anticipateOutsideUpdate = true) {
    return this.transaction(async () => {
      const $p = anticipateOutsideUpdate ? this.events.awaitEvent(HistoryEvents.OUTSIDE_MARKDOWN) : Promise.resolve();
      const [$t, clear] = timeout$(1000, "markdown await external update timeout"); // if the editor does not update in time, we will warn and continue
      this.events.emit(HistoryEvents.INSIDE_MARKDOWN, md);
      await Promise.race([$p, $t]);
      clear();
    });
  }

  teardown = () => {
    this.events.removeAllListeners();
  };

  private async saveNewEdit(newMarkdown: string) {
    await this.transaction(async () => {
      const edits = await this.historyStorage.getEdits(this.documentId);
      if (!edits.length) {
        // If there are no edits yet, we can save the initial state as the first edit
        const newEdit = await this.historyStorage.saveEdit(this.workspaceId, this.documentId, this.latestMarkdown);
        if (newEdit) {
          edits.unshift(newEdit); //Assuming ascending
          this.$edits = edits;
        } else {
          console.error("Failed to save initial edit");
        }
      }
      this.latestMarkdown = newMarkdown; //not $latestMarkdown to avoid loop
      const headEdit = edits[0];
      if (headEdit) {
        const headEditDoc = await this.historyStorage.reconstructDocumentFromEdit(headEdit);
        if (headEditDoc === newMarkdown) {
          // console.log(headEditDoc);
          // console.log("----------------");
          // console.log(newMarkdown);
          return console.debug("Skipping redundant edit save");
        }
      }
      const newEdit = await this.historyStorage.saveEdit(this.workspaceId, this.documentId, newMarkdown);
      if (newEdit) {
        edits.unshift(newEdit);
        this.$edits = edits;
      } else {
        console.error("Failed to save new edit");
      }
    });
  }

  clearAll = async () => {
    await this.historyStorage.clearAllEdits(this.documentId);
    this.$edits = [];
    this.$selectedEdit = null;
    this.$selectedEditMd = null;
  };

  clearSelectedEdit = () => {
    this.$selectedEdit = null;
    this.$selectedEditMd = null;
  };

  rebaseHistory = (md: string) => {
    // console.log(md);
    this.latestMarkdown = md;
    this.$selectedEdit = null;
    this.$selectedEditMd = null;
  };

  resetAndRestore = () => {
    this.$selectedEdit = null;
    this.$selectedEditMd = null;
    // this.events.emit(HistoryEvents.INSIDE_MARKDOWN, this.latestMarkdown);
    return this.publishMuted(this.latestMarkdown, false);
  };

  private async transaction(fn: () => void) {
    return this.mutex.runExclusive(async () => {
      this.muteChange = true;
      await fn();
      this.muteChange = false;
    });
  }

  triggerSave = async (newMarkdown: string) => {
    if (newMarkdown) {
      await this.saveNewEdit(newMarkdown);
    } else {
      console.warn("No latest markdown to save");
    }
  };
  setMarkdown = (md: string) => {
    this.events.emit(HistoryEvents.OUTSIDE_MARKDOWN, md);
  };
  handleMarkdown = (callback: (md: string) => void) => {
    this.events.on(HistoryEvents.INSIDE_MARKDOWN, callback);
  };
  handleSelectedEdit = (callback: (edit: HistoryDocRecord | null) => void) => {
    this.events.on(HistoryEvents.SELECTED_EDIT, callback);
  };
}
