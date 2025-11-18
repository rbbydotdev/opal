import { DestinationDAO } from "@/data/DestinationDAO";
import { useLiveQuery } from "dexie-react-hooks";

export function useDestinations(): {
  destinations: DestinationDAO[];
} {
  const destinations = useLiveQuery(() => DestinationDAO.all(), [], []);
  return {
    destinations,
  };
}
