import { CreateTypedEmitter } from "@/lib/TypeEmitter";
import fuzzysort from "fuzzysort";

export const EMPTY_SEARCH_RESULT: Fuzzysort.KeyResults<any> = Object.assign([], {
  total: 0,
});

export const isFuzzyResult = <T = any>(result: unknown): result is Fuzzysort.KeyResult<T> => {
  return (result as Fuzzysort.KeyResult<T>).highlight !== undefined;
};

export interface IRemoteAuthAgentSearch<T = any> {
  hasUpdates(
    etag: string | null,
    options?: { signal?: AbortSignal }
  ): Promise<{ updated: boolean; newEtag: string | null }>;
  fetchAll(options?: { signal?: AbortSignal }): Promise<T[]>;
}

type RemoteSearchEventMap<TResult = any> = {
  loading: boolean;
  results: Fuzzysort.KeyResults<TResult> | TResult[];
  error: string | null;
};

export class RemoteSearchFuzzyCache<TResult extends Record<string, any> = Record<string, any>> {
  private cache: {
    allItems: TResult[];
    etag: string | null;
    lastCheck: number;
  } = { allItems: [], etag: null, lastCheck: 0 };

  private _loading = false;
  private _results: Fuzzysort.KeyResults<TResult> | TResult[] = EMPTY_SEARCH_RESULT;
  private _error: string | null = null;
  private _searchTerm = "";
  private agent: IRemoteAuthAgentSearch<TResult> | null = null;
  private requestId = 0;
  private controller: AbortController | null = null;
  private events = CreateTypedEmitter<RemoteSearchEventMap>();

  constructor(
    agent: IRemoteAuthAgentSearch<TResult> | null = null,
    private searchKey: Extract<keyof TResult, string>
  ) {
    this.agent = agent;
  }

  get loading(): boolean {
    return this._loading;
  }

  get results(): Fuzzysort.KeyResults<TResult> | TResult[] {
    return this._results;
  }

  get error(): string | null {
    return this._error;
  }

  get searchTerm(): string {
    return this._searchTerm;
  }

  // Event subscription methods following iframe pattern
  onLoading = (callback: (loading: boolean) => void) => {
    return this.events.listen("loading", callback);
  };

  getLoading = () => {
    return this._loading;
  };

  onResults = (callback: (results: Fuzzysort.KeyResults<TResult> | TResult[]) => void) => {
    return this.events.listen("results", callback);
  };

  getResults = () => {
    return this._results;
  };

  onError = (callback: (error: string | null) => void) => {
    return this.events.listen("error", callback);
  };

  getError = () => {
    return this._error;
  };

  setSearchTerm(searchTerm: string): this {
    this._searchTerm = searchTerm;
    return this;
  }

  clearError(): this {
    if (this._error !== null) {
      this._error = null;
      this.events.emit("error", null);
    }
    return this;
  }

  search(): this {
    void this.performSearch();
    return this;
  }

  private setLoading(loading: boolean): void {
    if (this._loading !== loading) {
      this._loading = loading;
      this.events.emit("loading", loading);
    }
  }

  private setResults(results: Fuzzysort.KeyResults<TResult> | TResult[]): void {
    this._results = results;
    this.events.emit("results", results);
  }

  private setError(error: string | null): void {
    if (this._error !== error) {
      this._error = error;
      this.events.emit("error", error);
    }
  }

  private async performSearch(): Promise<void> {
    if (!this.agent) {
      this.setResults(EMPTY_SEARCH_RESULT);
      this.setLoading(false);
      this.setError(null);
      return;
    }

    this.controller?.abort();
    this.controller = new AbortController();
    const currentRequestId = ++this.requestId;

    try {
      // console.debug("Starting search, setting loading to true");
      this.setLoading(true);
      this.setError(null);

      let isStale = this.cache.allItems.length === 0;
      // console.debug("Cache status - isStale:", isStale, "cache length:", this.cache.allItems.length);

      // Check for updates if we have cached data and it's been more than 2 seconds
      if (!isStale && Date.now() - this.cache.lastCheck > 2000) {
        // console.debug("Checking for updates...");
        const { updated, newEtag } = await this.agent.hasUpdates(this.cache.etag, {
          signal: this.controller.signal,
        });
        isStale = updated;
        this.cache.etag = newEtag;
        this.cache.lastCheck = Date.now();
        // console.debug("Update check complete - isStale:", isStale);
      }

      // Fetch fresh data if needed
      if (isStale) {
        // console.debug("Data is stale, calling fetchAll...");
        this.cache.allItems = await this.agent.fetchAll({ signal: this.controller.signal });
        // console.debug("fetchAll complete, got", this.cache.allItems.length, "items");
      } else {
        // console.debug("Using cached data");
      }

      // Only update results if this is still the current request
      if (this.requestId === currentRequestId) {
        const searchResults = !this._searchTerm
          ? this.cache.allItems
          : fuzzysort.go(this._searchTerm, this.cache.allItems, { key: this.searchKey });

        this.setResults(searchResults);
        this.setLoading(false);
        this.setError(null);
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        const message = e?.message || "Unknown error";
        if (this.requestId === currentRequestId) {
          this.setError(message);
          this.setResults(EMPTY_SEARCH_RESULT);
        }
        console.error("Failed to search:", e);
      }
    } finally {
      if (this.requestId === currentRequestId) {
        this.setLoading(false);
      }
    }
  }

  cancel = (): void => {
    this.controller?.abort();
    this.controller = null;
  };

  dispose(): void {
    this.controller?.abort();
    this.controller = null;
    fuzzysort.cleanup();
    this.events.removeAllListeners();
  }
}
