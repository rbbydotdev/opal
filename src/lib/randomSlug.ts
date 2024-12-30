import { customAlphabet } from "nanoid";

export function randomSlug(length = 16) {
  return customAlphabet("1234567890abcdef", length)();
}
