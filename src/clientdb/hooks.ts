import { SettingsDB } from "@/clientdb";
import { db } from "@/clientdb/instance";
import { useLiveQuery } from "dexie-react-hooks";

export function useSetting<T extends SettingsDB>(settingName: string, defaultValue?: T["value"]) {
  const result = useLiveQuery(() => db.settings.get(settingName), [settingName]);
  const set = (value: T["value"]) => db.settings.put({ name: settingName, value });
  return [result?.value ?? defaultValue, set] as const;
}
