import { ClientDb } from "@/Db/instance";
import { useLiveQuery } from "dexie-react-hooks";
import { SettingsRecord } from "./Settings";

export function useSetting<T extends SettingsRecord>(settingName: string, defaultValue?: T["value"]) {
  const result = useLiveQuery(() => ClientDb.settings.get(settingName), [settingName]);
  const set = (value: T["value"]) => ClientDb.settings.put({ name: settingName, value });
  return [result?.value ?? defaultValue, set] as const;
}
