import { ClientDb } from "@/Db/instance";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";

export function useRemoteAuths() {
  const [error, setError] = useState<string | null>(null);
  const remoteAuths = useLiveQuery(
    () =>
      ClientDb.remoteAuths.toArray().then((remoteAuths) => {
        return remoteAuths.map((ra) => ({
          guid: ra.guid,
          name: ra.tag,
          authType: ra.authType,
        }));
      }),
    [],
    []
  );

  const deleteRemoteAuth = async (id: string) => {
    try {
      await ClientDb.remoteAuths.delete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete remote auth");
    }
  };

  return {
    remoteAuths,
    loading: false,
    error,
    refetch: () => {},
    deleteRemoteAuth,
  };
}
