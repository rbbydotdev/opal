import { DestinationDAO, DestinationMetaType, DestinationType } from "@/data/DestinationDAO";
import { RemoteAuthRecord } from "@/data/RemoteAuthTypes";
import { useRemoteAuths } from "@/hooks/useRemoteAuths";
import { useCallback, useState } from "react";

export function useDestinationFlow() {
  const { remoteAuths } = useRemoteAuths();
  const [destination, setDestination] = useState<DestinationDAO | null>(null);
  const [preferredNewConnection, setPreferredNewConnection] = useState<Pick<
    RemoteAuthRecord,
    "type" | "source"
  > | null>(null);
  const [preferredDestConnection, setPreferredDestConnection] = useState<RemoteAuthRecord | null>(null);

  const handleSubmit = useCallback(async ({ remoteAuthId, ...data }: DestinationMetaType<DestinationType>) => {
    const remoteAuth = remoteAuths.find((ra) => ra.guid === remoteAuthId);
    if (!remoteAuth) throw new Error("RemoteAuth not found");
    const newDestination = DestinationDAO.CreateNew({ ...data, remoteAuth });
    await newDestination.save();
    setDestination(newDestination);
    return newDestination;
  }, [remoteAuths]);

  const loadDestination = useCallback(async (destinationId: string) => {
    const dest = await DestinationDAO.FetchDAOFromGuid(destinationId, true);
    setDestination(dest);
    setPreferredDestConnection(dest.remoteAuth);
    return dest;
  }, []);

  const updateDestination = useCallback(async (data: DestinationMetaType<DestinationType>) => {
    if (!destination) return;
    await destination.update(data);
    return destination;
  }, [destination]);

  const reset = useCallback(() => {
    setDestination(null);
    setPreferredDestConnection(null);
    setPreferredNewConnection(null);
  }, []);

  return {
    // State
    destination,
    preferredNewConnection,
    preferredDestConnection,
    remoteAuths,

    // Actions
    handleSubmit,
    loadDestination,
    updateDestination,
    reset,

    // Setters for advanced use
    setPreferredNewConnection,
    setPreferredDestConnection,
    setDestination,
  };
}