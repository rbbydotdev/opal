import { ClientDb } from "@/data/instance";
import { RemoteAuthDAO } from "@/data/RemoteAuth";
import { RemoteAuthRecord } from "@/data/RemoteAuthTypes";
import { useLiveQuery } from "dexie-react-hooks";

export function useRemoteAuths() {
  const remoteAuths = useLiveQuery(() => ClientDb.remoteAuths.toArray(), [], []) as RemoteAuthRecord[];
  const deleteRemoteAuth = async (id: string) => {
    await RemoteAuthDAO.deleteByGuid(id);
  };
  return {
    remoteAuths,
    deleteRemoteAuth,
  };
}
