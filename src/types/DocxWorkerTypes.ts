import { AbsPath } from "@/lib/paths2";

export interface DocxWorkerApi {
  tearDown(): Promise<void>;
  docxConvert(
    workspace: any, // Use any to avoid circular dependency
    fullPathname: AbsPath,
    file: File,
    closeOnComplete?: boolean
  ): Promise<AbsPath>;
}

export type DocxConvertType = DocxWorkerApi;