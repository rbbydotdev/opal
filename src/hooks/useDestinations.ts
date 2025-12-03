import { DestinationDAO } from "@/data/DAO/DestinationDAO";
import { useLiveQuery } from "dexie-react-hooks";

export function useDestinations(): {
  destinations: DestinationDAO[];
} {
  const destinations = useLiveQuery(() => DestinationDAO.all(), [], []);
  return {
    destinations,
  };
}
