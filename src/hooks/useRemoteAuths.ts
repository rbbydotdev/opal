import { ClientDb } from "@/data/instance";
import { RemoteAuthDAO } from "@/data/RemoteAuth";
import { useLiveQuery } from "dexie-react-hooks";

export function useRemoteAuths() {
  const remoteAuths = useLiveQuery(() => ClientDb.remoteAuths.toArray(), [], []);
  const deleteRemoteAuth = async (id: string) => {
    await RemoteAuthDAO.deleteByGuid(id);
  };
  return {
    remoteAuths,
    deleteRemoteAuth,
  };
}
