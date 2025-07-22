"use client";
import { HistoryDocRecord, HistoryStorageInterface } from "@/Db/HistoryDAO";
import {
  Cell,
  debounceTime,
  filter,
  map,
  markdown$,
  markdownSourceEditorValue$,
  Realm,
  realmPlugin,
  setMarkdown$,
  Signal,
  withLatestFrom,
} from "@mdxeditor/editor";
import { Mutex } from "async-mutex";

export class HistoryPlugin {
  static edits$ = Cell<HistoryDocRecord[]>([]);
  static selectedEdit$ = Cell<HistoryDocRecord | null>(null, () => {}, false);
  static resetMd$ = Signal(() => {}, false);
  static clearAll$ = Signal(() => {}, false);
  static muteChange$ = Cell<boolean>(false);
  static latestMd$ = Cell<string>("");

  static selectedEditDoc$ = Cell<string | null>(null);

  static allMd$ = Cell("", (r) => {
    r.sub(markdown$, (md) => {
      r.pub(HistoryPlugin.allMd$, md);
    });
    r.sub(markdownSourceEditorValue$, (md) => {
      r.pub(HistoryPlugin.allMd$, md);
    });
  });

  private historyStorage: HistoryStorageInterface;
  private mutex = new Mutex();
  private id: string;

  private workspaceId: string;
  private realm: Realm;
  private historyRoot: string;
  private debounceFrequency: number;

  private saveThreshold: number;
  constructor(
    realm: Realm,
    {
      historyRoot,
      historyStorage,
      editHistoryId,
      workspaceId,
      saveThreshold = 0.7,
      debounceFrequency = 2_000,
    }: {
      historyRoot: string;
      historyStorage: HistoryStorageInterface;
      saveThreshold?: number;
      editHistoryId: string | null;
      workspaceId: string;
      debounceFrequency?: number;
    }
  ) {
    this.realm = realm;
    this.workspaceId = workspaceId;
    this.historyRoot = historyRoot;
    this.saveThreshold = saveThreshold;
    this.debounceFrequency = debounceFrequency;
    this.id = editHistoryId ?? "";
    this.historyStorage = historyStorage;
    this.init();
  }

  init({ workspaceId = this.workspaceId, id = this.id, historyRoot = this.historyRoot } = {}) {
    this.id = id;
    this.historyRoot = historyRoot;
    this.workspaceId = workspaceId;
    if (!this.id) {
      console.warn("Edit history ID cannot be null aborting");
      return;
    }

    this.realm.pub(HistoryPlugin.latestMd$, this.historyRoot);

    this.realm.singletonSub(
      this.realm.pipe(
        HistoryPlugin.allMd$,
        withLatestFrom(HistoryPlugin.muteChange$),
        filter(([, muted]) => !muted),
        map(([value]) => value),
        debounceTime(this.debounceFrequency)
      ),
      async (md) => {
        if (this.id !== null) {
          const saveScore = await this.historyStorage.getSaveThreshold(this.id, md);
          if (saveScore < this.saveThreshold) {
            console.log(`Skipping save for ${this.id} due to low score: ${saveScore}`);
            return;
          }

          const edits = await this.historyStorage.getEdits(this.id);
          if (!edits.length) {
            // If there are no edits yet, we can save the initial state as the first edit
            await this.historyStorage.saveEdit(this.workspaceId, this.id, this.realm.getValue(HistoryPlugin.latestMd$));
          }
          this.realm.pub(HistoryPlugin.latestMd$, md);
          const latest = await this.historyStorage.getLatestEdit(this.id);
          // check if edit is redundant
          if (latest) {
            const latestDoc = await this.historyStorage.reconstructDocumentFromEdit(latest);
            if (latestDoc === md) {
              console.log("Skipping redundant edit save");
              return;
            }
          }
          await this.historyStorage.saveEdit(this.workspaceId, this.id, md);
        }
      }
    );

    this.realm.singletonSub(HistoryPlugin.resetMd$, () => this.resetToStartingMarkdown());
    this.realm.singletonSub(HistoryPlugin.selectedEdit$, (edit: HistoryDocRecord | null) => {
      void this.transaction(async () => {
        if (edit) {
          const document = await this.historyStorage.reconstructDocumentFromEdit(edit);
          this.realm.pub(setMarkdown$, document);
          this.realm.pub(HistoryPlugin.selectedEditDoc$, document);
        } else {
          this.realm.pub(HistoryPlugin.selectedEditDoc$, null);
        }
      });
    });
    this.realm.singletonSub(HistoryPlugin.clearAll$, () => this.clearAll());

    void this.historyStorage.getEdits(this.id).then(async (edits) => {
      // Initialize the edits Cell with the current edits
      this.realm.pub(HistoryPlugin.edits$, edits);
    });

    this.historyStorage.onUpdate(this.id, (edits) => {
      this.realm.pub(HistoryPlugin.edits$, edits);
    });
  }

  private clearAll() {
    void this.transaction(async () => {
      await this.historyStorage.clearAllEdits(this.id!);
      this.resetToStartingMarkdown();
    });
  }

  private resetToStartingMarkdown() {
    void this.transaction(() => {
      if (!this.realm) {
        return console.error("no realm for history plugin");
      }
      this.realm.pub(setMarkdown$, this.realm.getValue(HistoryPlugin.latestMd$));
    });
  }

  private async transaction(fn: (realm: Realm | null) => void) {
    return this.mutex.runExclusive(async () => {
      if (this.realm === null) {
        console.error("realm not set");
        return;
      }
      this.realm.pub(HistoryPlugin.muteChange$, true);
      await fn(this.realm);
      this.realm.pub(HistoryPlugin.muteChange$, false);
    });
  }
}

export const historyPlugin = realmPlugin({
  init(
    realm: Realm,
    params?: {
      historyRoot: string;
      documentId: string | null;
      historyStorage: HistoryStorageInterface;
      workspaceId: string;
    }
  ) {
    new HistoryPlugin(realm, {
      historyRoot: params!.historyRoot,
      workspaceId: params!.workspaceId,
      editHistoryId: params!.documentId,
      historyStorage: params!.historyStorage,
    });
  },
});
