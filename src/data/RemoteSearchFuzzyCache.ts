import { RemoteAuthAgent } from "@/data/RemoteAuthTypes";
import { DeployBundle } from "@/services/deploy/DeployBundle";

export const EMPTY_SEARCH_RESULT: Fuzzysort.KeyResults<any> = Object.assign([], {
  total: 0,
});

export const isFuzzyResult = <T = any>(result: unknown): result is Fuzzysort.KeyResult<T> => {
  return (result as Fuzzysort.KeyResult<T>).highlight !== undefined;
};

export interface RemoteAuthAgentSearchType<T = unknown> {
  hasUpdates(
    etag: string | null,
    options?: { signal?: AbortSignal }
  ): Promise<{ updated: boolean; newEtag: string | null }>;
  fetchAll(options?: { signal?: AbortSignal }): Promise<T[]>;
}

export interface RemoteAuthAgentDeployableFiles<TBundle extends DeployBundle<any>, TParams = unknown>
  extends RemoteAuthAgent {
  deployFiles(bundle: TBundle, params: TParams): Promise<unknown>;
}
