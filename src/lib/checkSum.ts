import { fnv1a } from "@/lib/fnv1a";
export function checkSum(str: string): number {
  return fnv1a(str);
}
