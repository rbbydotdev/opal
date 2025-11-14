import { RemoteAuthDAO } from "@/data/RemoteAuth";
import { RemoteAuthJType } from "@/data/RemoteAuthTypes";

export class DestinationRecord<T = unknown> {
  guid!: string;
  label!: string;
  remoteAuth!: RemoteAuthDAO | RemoteAuthJType;
  meta!: T;
}
