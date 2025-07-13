import { absPath } from "@/lib/paths2";

export const SpecialDirs = {
  Trash: absPath("/.trash"),
  Storage: absPath("/.storage"),
  Git: absPath("/.git"),
  get All() {
    return [this.Trash, this.Storage, this.Git];
  },
} as const;
