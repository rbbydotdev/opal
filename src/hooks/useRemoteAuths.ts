import { ClientDb } from "@/data/instance";
import { RemoteAuthRecord } from "@/data/RemoteAuthTypes";
import { useLiveQuery } from "dexie-react-hooks";

export function useRemoteAuths() {
  const remoteAuths = useLiveQuery(() => ClientDb.remoteAuths.toArray(), [], []) as RemoteAuthRecord[];
  return {
    remoteAuths,
  };
}
