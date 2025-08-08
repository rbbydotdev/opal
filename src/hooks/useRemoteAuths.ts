import { ClientDb } from "@/Db/instance";
import { RemoteAuthDAO } from "@/Db/RemoteAuth";
import { useEffect, useState } from "react";

export interface RemoteAuthOption {
  id: string;
  name: string;
  authType: "api" | "oauth";
}

export function useRemoteAuths() {
  const [remoteAuths, setRemoteAuths] = useState<RemoteAuthOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRemoteAuths = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const auths = await ClientDb.remoteAuths.toArray();
      const authOptions: RemoteAuthOption[] = auths.map(auth => ({
        id: auth.guid,
        name: auth.tag,
        authType: auth.authType,
      }));
      
      setRemoteAuths(authOptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch remote auths");
    } finally {
      setLoading(false);
    }
  };

  const deleteRemoteAuth = async (id: string) => {
    try {
      await ClientDb.remoteAuths.delete(id);
      await fetchRemoteAuths(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete remote auth");
    }
  };

  useEffect(() => {
    fetchRemoteAuths();
  }, []);

  return { 
    remoteAuths, 
    loading, 
    error, 
    refetch: fetchRemoteAuths,
    deleteRemoteAuth
  };
}