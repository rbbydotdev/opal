import { RemoteAuthDAO } from "@/data/dao/RemoteAuthDAO";
import { useLiveQuery } from "dexie-react-hooks";

export function useRemoteAuths({ sources }: { sources?: string[] } = {}): {
  remoteAuths: RemoteAuthDAO[];
} {
  const remoteAuths = useLiveQuery(
    () =>
      RemoteAuthDAO.all().then((auths) => {
        let filteredAuths = auths;
        if (sources && sources.length > 0) {
          filteredAuths = filteredAuths.filter((auth) => sources.includes(auth.source));
        }
        return filteredAuths;
      }),
    [sources],
    []
  );
  return {
    remoteAuths,
  };
}
