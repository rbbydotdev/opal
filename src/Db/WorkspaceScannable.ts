import { Disk } from "@/Db/Disk";
import { SearchTextScannable } from "@/features/search/SearchScannable";

export class WorkspaceScannable extends SearchTextScannable<WorkspaceScannableMetaType, Disk> {
  constructor(disk: Disk, meta: WorkspaceScannableMetaType) {
    super(disk, meta);
  }
}
export type WorkspaceScannableMetaType = { workspaceId: string; workspaceName: string };
export type WorkspaceSearchItem = UnwrapAsyncGeneratorYield<ReturnType<WorkspaceScannable["search"]>>;
