import { ClientDb } from "@/Db/instance";
import { RemoteAuthDAO } from "@/Db/RemoteAuth";
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
