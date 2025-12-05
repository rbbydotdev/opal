import { RemoteAuthRecord } from "@/data/RemoteAuthTypes";

export class DestinationRecord<T = unknown> {
  guid!: string;
  label!: string;
  remoteAuth!: RemoteAuthRecord;
  meta!: T;
  timestamp?: number;
  remoteAuthGuid?: string;
}
