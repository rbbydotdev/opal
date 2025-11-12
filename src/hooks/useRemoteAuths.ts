import { ClientDb } from "@/data/instance";
import { RemoteAuthRecord } from "@/data/RemoteAuthTypes";
import { useLiveQuery } from "dexie-react-hooks";

export function useRemoteAuths({ sources }: { sources?: string[] } = {}) {
  const remoteAuths = useLiveQuery(
    () =>
      ClientDb.remoteAuths.toArray().then((auths) => {
        let filteredAuths = auths;
        if (sources && sources.length > 0) {
          filteredAuths = filteredAuths.filter((auth) => sources.includes(auth.source));
        }
        return filteredAuths;
      }),
    [sources],
    []
  ) as RemoteAuthRecord[];
  return {
    remoteAuths,
  };
}
